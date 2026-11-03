import type { ProjectExposeContext } from '@volar/language-server/lib/project/typescriptProjectLs'
import type { URI } from 'vscode-uri'
import {
  createMpxLanguagePlugin,
  createParsedCommandLine,
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
  onConfigFileAccess?: (fileName: string) => void,
) {
  // Track the actual config/extends reads, including custom config names and
  // failed reads that may become valid after a file is created.
  const configHost = onConfigFileAccess
    ? {
        ...ts.sys,
        readFile(fileName: string) {
          onConfigFileAccess(fileName)
          return ts.sys.readFile(fileName)
        },
        fileExists(fileName: string) {
          onConfigFileAccess(fileName)
          return ts.sys.fileExists(fileName)
        },
      }
    : ts.sys
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
  return {
    languagePlugins: [
      withMpxJsonServiceScripts(
        createMpxLanguagePlugin(
          ts,
          commandLine.options,
          commandLine.mpxOptions,
          (uri: { fsPath: string }) => uri.fsPath.replace(/\\/g, '/'),
          // Application registrations use the same URI identity and filesystem
          // snapshots as JSON dependencies in both IDE and agent projects.
          uriConverter.asUri,
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
      if (jsonOnly && project.typescript) {
        const host = project.typescript.languageServiceHost
        const getVersion = host.getProjectVersion
        // Volar can suppress a TS version bump when only non-service virtual
        // snapshots changed. Application associations add such snapshots; do
        // not let them hide a concurrent native JS/TS document update. This
        // host is queried only by JSON semantics, never ordinary templates.
        host.getProjectVersion = () =>
          `${getVersion?.() ?? ''}:${projectHost.getProjectVersion?.() ?? ''}`
      }
    },
  }
}
