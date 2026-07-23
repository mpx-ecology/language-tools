import fs from 'node:fs'
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
  getServiceScript(relativePath: string): {
    code: string
    root: MpxVirtualCode
  }
  dispose(): void
}

export function createTestLanguageService(
  fixtureRoot = referenceTypePropsFixtureRoot,
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
  )

  const language: Language<string> = createLanguage(
    [languagePlugin],
    new Map<string, SourceScript<string>>(),
    id => {
      const content = readFile(id)
      if (content !== undefined) {
        language.scripts.set(
          id,
          ts.ScriptSnapshot.fromString(content),
          getLanguageId(id),
        )
      }
    },
  )

  for (const fileName of mpxFiles) {
    language.scripts.set(
      fileName,
      ts.ScriptSnapshot.fromString(fs.readFileSync(fileName, 'utf8')),
      'mpx',
    )
  }

  const rootFiles = [...mpxFiles, ...virtualFiles.keys()]
  const moduleResolutionCache = ts.createModuleResolutionCache(
    fixtureRoot,
    fileName => fileName,
    compilerOptions,
  )
  const host: ts.LanguageServiceHost = {
    getScriptFileNames: () => rootFiles,
    getScriptVersion: () => '0',
    getScriptSnapshot(fileName) {
      const content = readFile(fileName)
      return content === undefined
        ? undefined
        : ts.ScriptSnapshot.fromString(content)
    },
    getScriptKind,
    getCurrentDirectory: () => fixtureRoot,
    getCompilationSettings: () => compilerOptions,
    getDefaultLibFileName: options => ts.getDefaultLibFilePath(options),
    fileExists: fileName =>
      virtualFiles.has(fileName) || ts.sys.fileExists(fileName),
    readFile,
    readDirectory: ts.sys.readDirectory,
    directoryExists: ts.sys.directoryExists,
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
            },
            moduleResolutionCache,
          ).resolvedModule,
      ),
  }

  decorateLanguageServiceHost(ts, language, host)
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
    read: relativePath =>
      fs.readFileSync(path.join(fixtureRoot, relativePath), 'utf8'),
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
    return virtualFiles.get(fileName) ?? ts.sys.readFile(fileName)
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
