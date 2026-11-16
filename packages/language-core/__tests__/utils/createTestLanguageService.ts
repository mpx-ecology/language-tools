import path from 'node:path'
import type { Language } from '@volar/language-core'
import { type SourceScript, createLanguage } from '@volar/language-core'
import {
  createProxyLanguageService,
  decorateLanguageServiceHost,
} from '@volar/typescript'
import {
  MpxVirtualCode,
  createMpxLanguagePlugin,
  createParsedCommandLine,
  decorateMpxLanguageServiceHost,
  generateGlobalTypes,
  getGlobalTypesFileName,
  nativeComponentsTypesContents,
  nativeComponentsTypesFileName,
} from '../../src'
import * as ts from 'typescript'

export const referenceTypePropsFixtureRoot = path.resolve(
  __dirname,
  '../fixtures/reference-type-props',
)

export interface TestLanguageService {
  fixtureRoot: string
  language: Language<string>
  languageService: ts.LanguageService
  languageServiceHost: ts.LanguageServiceHost
  proxyLanguageService: ts.LanguageService
  file(relativePath: string): string
  read(relativePath: string): string
  updateFile(relativePath: string, content: string): void
  getServiceScript(relativePath: string): {
    code: string
    root: MpxVirtualCode
  }
  dispose(): void
}

export function createTestLanguageService(
  fixtureRoot = referenceTypePropsFixtureRoot,
  additionalRootFiles: string[] = [],
  fileOverrides = new Map<string, string | undefined>(),
  pluginOptions?: { serviceScriptOnly?: boolean },
): TestLanguageService {
  const parsed = createParsedCommandLine(
    ts,
    ts.sys,
    path.join(fixtureRoot, 'tsconfig.json'),
    true,
  )
  const globalTypesFile = path.join(
    fixtureRoot,
    'node_modules/.mpx-global-types',
    getGlobalTypesFileName(parsed.mpxOptions),
  )
  const nativeComponentsFile = path.join(
    path.dirname(globalTypesFile),
    `${nativeComponentsTypesFileName}.d.ts`,
  )
  parsed.mpxOptions.__setupedGlobalTypes = {
    absolutePath: globalTypesFile,
  }

  const virtualFiles = new Map<string, string>([
    [
      globalTypesFile,
      `// @ts-nocheck\nexport {};\n${generateGlobalTypes(parsed.mpxOptions)}`,
    ],
    [nativeComponentsFile, nativeComponentsTypesContents],
  ])
  const versions = new Map<string, number>()
  const snapshots = new Map<
    string,
    { content: string; snapshot: ts.IScriptSnapshot }
  >()
  let projectVersion = 0
  const compilerOptions: ts.CompilerOptions = {
    ...parsed.options,
    allowNonTsExtensions: true,
  }
  const mpxFiles = ts.sys.readDirectory(fixtureRoot, ['.mpx'], undefined, [
    '**/*',
  ])
  const languagePlugin = createMpxLanguagePlugin<string>(
    ts,
    compilerOptions,
    parsed.mpxOptions,
    id => id,
    undefined,
    false,
    pluginOptions,
  )

  const scriptRegistry = new Map<string, SourceScript<string>>()
  const associationVersions = new Map<string, number>()
  const language: Language<string> = createLanguage(
    [languagePlugin],
    scriptRegistry,
    id => {
      languagePlugin.getExternalFilesVersion(id, fileName => {
        const source = scriptRegistry.get(fileName)
        if (source) source.isAssociationDirty = true
      })
      const snapshot = getSnapshot(id)
      if (snapshot) language.scripts.set(id, snapshot, getLanguageId(id))
      else {
        snapshots.delete(id)
        language.scripts.delete(id)
      }
    },
    id => associationVersions.set(id, (associationVersions.get(id) ?? 0) + 1),
  )

  for (const fileName of mpxFiles) {
    language.scripts.set(fileName, getSnapshot(fileName)!, 'mpx')
  }

  const rootFiles = [
    ...additionalRootFiles,
    ...mpxFiles,
    ...virtualFiles.keys(),
  ]
  const moduleResolutionCache = ts.createModuleResolutionCache(
    fixtureRoot,
    fileName => fileName,
    compilerOptions,
  )
  const host: ts.LanguageServiceHost = {
    getScriptFileNames: () => rootFiles,
    getScriptVersion: fileName =>
      `${versions.get(fileName) ?? 0}:${fileOverrides.has(fileName) ? (fileOverrides.get(fileName) ?? 'missing') : '0'}:${associationVersions.get(fileName) ?? 0}`,
    getProjectVersion: () =>
      `${projectVersion}:${JSON.stringify([...fileOverrides])}:${JSON.stringify([...associationVersions])}`,
    getScriptSnapshot: getSnapshot,
    getScriptKind,
    getCurrentDirectory: () => fixtureRoot,
    getCompilationSettings: () => compilerOptions,
    getDefaultLibFileName: options => ts.getDefaultLibFilePath(options),
    fileExists: fileName =>
      virtualFiles.has(fileName) || ts.sys.fileExists(fileName),
    readFile,
    readDirectory: ts.sys.readDirectory,
    directoryExists: directoryName =>
      [...virtualFiles.keys()].some(file =>
        file.startsWith(directoryName + path.sep),
      ) || ts.sys.directoryExists(directoryName),
    getDirectories: ts.sys.getDirectories,
    realpath: ts.sys.realpath,
    getModuleResolutionCache: () => moduleResolutionCache,
    resolveModuleNames: (moduleNames, containingFile) =>
      moduleNames.map(
        moduleName =>
          ts.resolveModuleName(
            moduleName,
            containingFile,
            compilerOptions,
            {
              ...ts.sys,
              fileExists: fileName =>
                virtualFiles.has(fileName) || ts.sys.fileExists(fileName),
              readFile,
              directoryExists: directoryName =>
                [...virtualFiles.keys()].some(file =>
                  file.startsWith(directoryName + path.sep),
                ) || ts.sys.directoryExists(directoryName),
            },
            moduleResolutionCache,
          ).resolvedModule,
      ),
  }

  decorateLanguageServiceHost(ts, language, host)
  decorateMpxLanguageServiceHost(host, languagePlugin, fileName => {
    const source = language.scripts.get(fileName)
    if (source) source.isAssociationDirty = true
  })
  const languageService = ts.createLanguageService(host)
  const { initialize, proxy } = createProxyLanguageService(languageService)
  initialize(language)

  return {
    fixtureRoot,
    language,
    languageService,
    languageServiceHost: host,
    proxyLanguageService: proxy,
    file: relativePath => path.join(fixtureRoot, relativePath),
    read: relativePath => readFile(path.join(fixtureRoot, relativePath))!,
    updateFile(relativePath, content) {
      const fileName = path.join(fixtureRoot, relativePath)
      virtualFiles.set(fileName, content)
      versions.set(fileName, (versions.get(fileName) ?? 0) + 1)
      projectVersion++
      language.scripts.set(
        fileName,
        getSnapshot(fileName)!,
        getLanguageId(fileName),
      )
    },
    getServiceScript(relativePath) {
      const fileName = path.join(fixtureRoot, relativePath)
      const sourceScript = language.scripts.get(fileName)
      if (!(sourceScript?.generated?.root instanceof MpxVirtualCode)) {
        throw new Error(`Unable to create Mpx virtual code for ${relativePath}`)
      }
      const serviceScript =
        sourceScript.generated.languagePlugin.typescript?.getServiceScript(
          sourceScript.generated.root,
        )
      if (!serviceScript) {
        throw new Error(
          `Unable to create TypeScript service script for ${relativePath}`,
        )
      }
      return {
        code: serviceScript.code.snapshot.getText(
          0,
          serviceScript.code.snapshot.getLength(),
        ),
        root: sourceScript.generated.root,
      }
    },
    dispose: () => languageService.dispose(),
  }

  function readFile(fileName: string) {
    return fileOverrides.has(fileName)
      ? fileOverrides.get(fileName)
      : (virtualFiles.get(fileName) ?? ts.sys.readFile(fileName))
  }

  // Real editor documents retain snapshot identity until their text changes.
  function getSnapshot(fileName: string) {
    const content = readFile(fileName)
    if (content === undefined) return
    let cached = snapshots.get(fileName)
    if (cached?.content !== content) {
      cached = { content, snapshot: ts.ScriptSnapshot.fromString(content) }
      snapshots.set(fileName, cached)
    }
    return cached.snapshot
  }
}

function getLanguageId(fileName: string) {
  if (fileName.endsWith('.mpx')) {
    return 'mpx'
  }
  if (fileName.endsWith('.js')) {
    return 'javascript'
  }
  if (fileName.endsWith('.json')) {
    return 'json'
  }
  return 'typescript'
}

function getScriptKind(fileName: string) {
  if (fileName.endsWith('.mpx')) {
    return ts.ScriptKind.Deferred
  }
  if (fileName.endsWith('.js')) {
    return ts.ScriptKind.JS
  }
  if (fileName.endsWith('.jsx')) {
    return ts.ScriptKind.JSX
  }
  if (fileName.endsWith('.json')) {
    return ts.ScriptKind.JSON
  }
  if (fileName.endsWith('.tsx')) {
    return ts.ScriptKind.TSX
  }
  return ts.ScriptKind.TS
}
