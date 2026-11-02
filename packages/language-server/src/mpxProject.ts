import type { ProjectExposeContext } from '@volar/language-server/lib/project/typescriptProjectLs'
import type { URI } from 'vscode-uri'
import {
  createMpxLanguagePlugin,
  createParsedCommandLine,
  getAllExtensions,
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
  { configFileName, projectHost, sys, uriConverter }: ProjectExposeContext,
  jsonOnly = false,
  documents?: DocumentState,
) {
  const commandLine = configFileName
    ? createParsedCommandLine(ts, ts.sys, configFileName, jsonOnly)
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
  if (jsonOnly) {
    const getFileNames = projectHost.getScriptFileNames
    const extensions = getAllExtensions(commandLine.mpxOptions)
    // Native business files enter this program only when a JSON module imports
    // them. Ambient declarations remain roots so project globals are available.
    projectHost.getScriptFileNames = () =>
      getFileNames().filter(
        fileName =>
          /\.d\.[cm]?ts$/.test(fileName) ||
          extensions.some(ext => fileName.endsWith(ext)),
      )
  }
  return {
    languagePlugins: [
      withMpxJsonServiceScripts(
        createMpxLanguagePlugin(
          ts,
          commandLine.options,
          commandLine.mpxOptions,
          (uri: { fsPath: string }) => uri.fsPath.replace(/\\/g, '/'),
        ),
        jsonOnly,
      ),
    ],
    setup({
      project,
    }: {
      project: import('@mpxjs/language-service').ProjectContext
    }) {
      project.mpx = { compilerOptions: commandLine.mpxOptions }
    },
  }
}
