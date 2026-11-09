import type { ProjectExposeContext } from '@volar/language-server/lib/project/typescriptProjectLs'
import { URI } from 'vscode-uri'
import { FileChangeType } from '@volar/language-server'
import {
  createMpxLanguagePlugin,
  createParsedCommandLine,
  decorateMpxLanguageServiceHost,
  getDefaultCompilerOptions,
  withMpxJsonServiceScripts,
} from '@mpxjs/language-core'

interface DocumentState {
  isOpen(uri: URI): boolean
  getClosedVersion(): number
}

/** Shared setup for IDE JSON-only projects and the agent's complete project. */
export function createMpxProject(
  ts: typeof import('typescript'),
  { configFileName, projectHost, sys, uriConverter, env }: ProjectExposeContext,
  jsonOnly = false,
  documents?: DocumentState,
  onConfigFileAccess?: (fileName: string) => void,
) {
  // Track the actual config/extends reads, including custom config names and
  // failed reads that may become valid after a file is created.
  const configHost = {
    ...ts.sys,
    // Volar reads the project's roots separately.
    readDirectory: () => [],
    readFile(fileName: string) {
      onConfigFileAccess?.(fileName)
      return ts.sys.readFile(fileName)
    },
    fileExists(fileName: string) {
      onConfigFileAccess?.(fileName)
      return ts.sys.fileExists(fileName)
    },
  }
  const commandLine = configFileName
    ? createParsedCommandLine(ts, configHost, configFileName, jsonOnly)
    : {
        options: ts.getDefaultCompilerOptions(),
        mpxOptions: getDefaultCompilerOptions(),
      }
  if (documents) {
    const getVersion = projectHost.getProjectVersion
    projectHost.getProjectVersion = () =>
      `${getVersion?.() ?? ''}:${documents.getClosedVersion()}`
    const getModifiedTime = sys.getModifiedTime
    if (getModifiedTime) {
      // Volar caches disk snapshots using mtime, including the initial didOpen
      // buffer. Give open snapshots a separate key so discarding a recovered
      // buffer reloads disk even when the file itself has never changed.
      sys.getModifiedTime = fileName => {
        const time = getModifiedTime(fileName)
        return time &&
          time.valueOf() >= 0 &&
          documents.isOpen(uriConverter.asUri(fileName))
          ? new Date(-time.valueOf() - 2)
          : time
      }
    }
  }
  // JSON virtual modules are JS even when the business project contains only TS.
  // Keep checkJs and all resolution settings from the project.
  const getSettings = projectHost.getCompilationSettings
  projectHost.getCompilationSettings = () => ({
    ...getSettings(),
    allowJs: true,
    noEmit: true,
  })
  // Preserve tsconfig roots: global augmentations can live in ordinary modules
  // or be introduced transitively through their imports. jsonOnly disables the
  // Mpx business service script, not the project's ambient type environment.
  const jsonFiles = new Map<string, { active: number; lastUsed: number }>()
  const deletedJsonFiles = new Set<string>()
  let jsonVersion = 0
  let accessOrder = 0
  let closedVersion = documents?.getClosedVersion()
  const maxClosedFiles = 32
  const removeJsonFile = (fileName: string) => {
    deletedJsonFiles.delete(fileName)
    if (jsonFiles.delete(fileName)) jsonVersion++
  }
  // Keep open files and concurrent requests pinned; bound the closed-file cache.
  const pruneClosedFiles = () => {
    for (const fileName of deletedJsonFiles) {
      if (
        !jsonFiles.get(fileName)?.active &&
        !documents?.isOpen(uriConverter.asUri(fileName))
      )
        removeJsonFile(fileName)
    }
    if (jsonFiles.size <= maxClosedFiles) return
    const closed = [...jsonFiles].filter(
      ([fileName, state]) =>
        !state.active && !documents?.isOpen(uriConverter.asUri(fileName)),
    )
    closed.sort((a, b) => a[1].lastUsed - b[1].lastUsed)
    for (const [fileName] of closed.slice(0, -maxClosedFiles))
      removeJsonFile(fileName)
  }
  const includeJsonScript = (uri: URI) => {
    const fileName = uriConverter.asFileName(uri)
    let state = jsonFiles.get(fileName)
    if (!state) {
      jsonFiles.set(fileName, (state = { active: 0, lastUsed: 0 }))
      jsonVersion++
    }
    state.active++
    state.lastUsed = ++accessOrder
    return () => {
      state.active--
      if (!state.active && !documents?.isOpen(uri)) {
        if (deletedJsonFiles.has(fileName)) removeJsonFile(fileName)
        else pruneClosedFiles()
      }
    }
  }
  const jsonWatcher = jsonOnly
    ? env?.onDidChangeWatchedFiles?.(params => {
        for (const change of params.changes) {
          const uri = URI.parse(change.uri)
          const fileName = uriConverter.asFileName(uri)
          if (change.type === FileChangeType.Deleted) {
            const state = jsonFiles.get(fileName)
            if (!state) continue
            if (state.active || documents?.isOpen(uri))
              deletedJsonFiles.add(fileName)
            else removeJsonFile(fileName)
          } else if (change.type === FileChangeType.Created)
            deletedJsonFiles.delete(fileName)
        }
      })
    : undefined
  if (jsonOnly) {
    const { extensions } = commandLine.mpxOptions
    const getFiles = projectHost.getScriptFileNames
    const getVersion = projectHost.getProjectVersion
    // JSON scripts are independent CommonJS modules. Load them when requested,
    // preserving the ordinary TS/JS roots that contribute ambient declarations.
    projectHost.getScriptFileNames = () => [
      ...getFiles().filter(file => !extensions.some(ext => file.endsWith(ext))),
      ...jsonFiles.keys(),
    ]
    projectHost.getProjectVersion = () => {
      const nextClosedVersion = documents?.getClosedVersion()
      if (nextClosedVersion !== closedVersion) {
        closedVersion = nextClosedVersion
        pruneClosedFiles()
      }
      return `${getVersion?.() ?? ''}:${jsonVersion}`
    }
  }
  const languagePlugin = createMpxLanguagePlugin(
    ts,
    commandLine.options,
    commandLine.mpxOptions,
    (uri: { fsPath: string }) => uri.fsPath.replace(/\\/g, '/'),
    uriConverter.asUri,
    true,
  )
  const dispose = sys.dispose
  sys.dispose = () => {
    jsonWatcher?.dispose()
    jsonFiles.clear()
    deletedJsonFiles.clear()
    languagePlugin.dispose()
    dispose()
  }
  return {
    languagePlugins: [withMpxJsonServiceScripts(languagePlugin, jsonOnly)],
    setup({
      project,
      language,
    }: {
      project: import('@mpxjs/language-service').ProjectContext
      language: import('@mpxjs/language-service').Language
    }) {
      project.mpx = {
        compilerOptions: commandLine.mpxOptions,
        typescriptCompilerOptions: commandLine.options,
        includeJsonScript: jsonOnly ? includeJsonScript : undefined,
      }
      if (project.typescript) {
        const host = project.typescript.languageServiceHost
        const getProjectVersion = host.getProjectVersion?.bind(host)
        // Volar may suppress its TS version when only non-TS virtual metadata
        // changes. A native dependency edit in the same update still matters.
        host.getProjectVersion = () =>
          `${getProjectVersion?.() ?? ''}:${projectHost.getProjectVersion?.() ?? ''}`
        decorateMpxLanguageServiceHost(host, languagePlugin, fileName => {
          const source = language.scripts.get(uriConverter.asUri(fileName))
          if (source) source.isAssociationDirty = true
        })
      }
    },
  }
}
