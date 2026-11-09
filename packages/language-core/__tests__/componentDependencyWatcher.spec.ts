import * as fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { expect, it, vi } from 'vitest'
import { watchComponentDependency } from '../src/utils/componentDependencyWatcher'

const state = vi.hoisted(() => ({
  callbacks: new Map<string, (event: string, name: string | null) => void>(),
}))
vi.mock('node:fs', async importOriginal => ({
  ...(await importOriginal<typeof fs>()),
  watch: vi.fn(
    (
      directory: string,
      _options: unknown,
      callback: (event: string, name: string | null) => void,
    ) => {
      state.callbacks.set(directory, callback)
      return { on: vi.fn(), close: vi.fn() }
    },
  ),
}))

it('dispatches once when a callback replaces its subscription and leaves other owners alone', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'mpx-watcher-reentry-'))
  const directory = path.join(root, 'watched')
  const other = path.join(root, 'other')
  fs.mkdirSync(directory)
  fs.mkdirSync(other)
  const version = (file: string) => {
    const stat = fs.statSync(file)
    return `${stat.ino}:${stat.mtimeMs}:${stat.ctimeMs}:${stat.size}`
  }
  const stable = vi.fn()
  const unrelated = vi.fn()
  const replacement = vi.fn()
  const closeStable = watchComponentDependency(
    directory,
    false,
    version(directory),
    stable,
  )
  const closeOther = watchComponentDependency(
    other,
    false,
    version(other),
    unrelated,
  )
  let close = () => {}
  const first = vi.fn(() => {
    close()
    close = watchComponentDependency(
      directory,
      false,
      version(directory),
      replacement,
    )
  })
  close = watchComponentDependency(directory, false, version(directory), first)
  try {
    state.callbacks.get(directory)!('rename', 'panel.ios.mpx')
    expect(first).toHaveBeenCalledTimes(1)
    expect(replacement).not.toHaveBeenCalled()
    expect(stable).toHaveBeenCalledTimes(1)
    expect(unrelated).not.toHaveBeenCalled()
    state.callbacks.get(directory)!('rename', 'panel.ios.mpx')
    expect(replacement).toHaveBeenCalledTimes(1)
    expect(stable).toHaveBeenCalledTimes(2)
    expect(unrelated).not.toHaveBeenCalled()
  } finally {
    close()
    closeStable()
    closeOther()
    state.callbacks.clear()
    fs.rmSync(root, { recursive: true, force: true })
  }
})
