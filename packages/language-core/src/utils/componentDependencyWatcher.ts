import * as fs from 'node:fs'
import * as path from 'node:path'

type Listener = (event: string, name: string | null) => void
const directories = new Map<
  string,
  { watcher: fs.FSWatcher; listeners: Set<Listener> }
>()

function subscribe(directory: string, listener: Listener) {
  let entry = directories.get(directory)
  if (!entry) {
    const listeners = new Set<Listener>()
    try {
      const watcher = fs.watch(
        directory,
        { persistent: false },
        (event, name) => {
          for (const notify of [...listeners]) notify(event, name)
        },
      )
      entry = { watcher, listeners }
      directories.set(directory, entry)
      watcher.on('error', () => {
        // Re-resolving the affected entries attaches new watches or falls back
        // to polling the individual paths if the directory can't be watched.
        for (const notify of [...listeners]) notify('rename', null)
      })
    } catch {
      return
    }
  }
  const { watcher, listeners } = entry
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
    if (!listeners.size) {
      directories.delete(directory)
      watcher.close()
    }
  }
}

const dependencies = new Map<
  string,
  { close: () => void; listeners: Set<() => void> }
>()

export function watchComponentDependency(
  fileName: string,
  content: boolean,
  expectedVersion: string,
  invalidate: () => void,
) {
  const key = `${content ? 'file' : 'directory'}:${fileName}`
  let entry = dependencies.get(key)
  if (!entry) {
    const listeners = new Set<() => void>()
    const close = watchDependency(fileName, content, expectedVersion, () => {
      for (const notify of [...listeners]) notify()
    })
    entry = { close, listeners }
    dependencies.set(key, entry)
  }
  const { close, listeners } = entry
  listeners.add(invalidate)
  return () => {
    listeners.delete(invalidate)
    if (!listeners.size) {
      dependencies.delete(key)
      close()
    }
  }
}

function watchDependency(
  fileName: string,
  content: boolean,
  expectedVersion: string,
  invalidate: () => void,
) {
  const closes: (() => void)[] = []
  const version = pathVersion(fileName)
  let watchOwnDirectory = false
  if (!content) {
    // Watch child additions and removals, and the directory's own replacement.
    const close = subscribe(fileName, event => {
      if (event === 'rename' || pathVersion(fileName) !== version) invalidate()
    })
    if (close) {
      watchOwnDirectory = true
      closes.push(close)
    }
  }

  let child = fileName
  let directory = path.dirname(child)
  let watchParent = false
  for (;;) {
    const name = path.basename(child).toLowerCase()
    const close = subscribe(directory, (_, entry) => {
      if (entry === null || entry.toLowerCase() === name) invalidate()
    })
    if (close) {
      watchParent = true
      closes.push(close)
      break
    }
    // A missing package or directory can appear with its component already
    // inside. Listen for the first missing path segment.
    if (directory === child || isDirectory(directory)) break
    child = directory
    directory = path.dirname(child)
  }

  if (
    !watchParent ||
    (!content && !watchOwnDirectory && isDirectory(fileName))
  ) {
    fs.watchFile(fileName, { persistent: false, interval: 1000 }, invalidate)
    closes.push(() => fs.unwatchFile(fileName, invalidate))
  }
  // Native watchers may miss mutations made in the same turn they are
  // installed. Recheck once after installation, then rely on file events.
  const startupCheck = setImmediate(() => {
    if (pathVersion(fileName) !== expectedVersion) invalidate()
  })
  startupCheck.unref()
  return () => {
    clearImmediate(startupCheck)
    for (const close of closes) close()
  }
}

function isDirectory(fileName: string) {
  try {
    return fs.statSync(fileName, { throwIfNoEntry: false })?.isDirectory()
  } catch {
    return false
  }
}

function pathVersion(fileName: string) {
  try {
    const stat = fs.statSync(fileName, { throwIfNoEntry: false })
    if (stat) return `${stat.ino}:${stat.mtimeMs}:${stat.ctimeMs}:${stat.size}`
  } catch {
    // The dependency can become inaccessible before its watcher is notified.
  }
  return ''
}
