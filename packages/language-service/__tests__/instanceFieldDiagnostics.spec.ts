import path from 'node:path'
import * as ts from 'typescript'
import { expect, it } from 'vitest'
import { URI } from 'vscode-uri'
import { createLanguageService, createUriMap } from '@volar/language-service'
import {
  createLanguage,
  createMpxLanguagePlugin,
} from '../../language-core/src'
import { createLanguageServiceHost } from '@volar/typescript'
import { create as createSemanticPlugin } from '../src/plugins/typescript-semantic'
import { create as createInstanceFieldPlugin } from '../src/plugins/mpx-instance-fields'
import { createTestLanguageService } from '../../language-core/__tests__/utils/createTestLanguageService'
const fixtureRoot = path.resolve(
  __dirname,
  '../../language-core/__tests__/fixtures/instance-fields',
)
function createServices() {
  const fixture = createTestLanguageService(fixtureRoot)
  const compilerOptions = fixture.languageServiceHost.getCompilationSettings()
  const mpxOptions =
    fixture.getServiceScript('index.mpx').root.mpxCompilerOptions
  const options = mpxOptions
  const readFile = (fileName: string) => {
    const snapshot = fileName.endsWith('.mpx')
      ? fixture.language.scripts.get(fileName)?.snapshot
      : fixture.languageServiceHost.getScriptSnapshot(fileName)
    return snapshot?.getText(0, snapshot.getLength())
  }
  const sys = {
    ...ts.sys,
    // Match the standalone server's watched-file version for dependency edits.
    get version() {
      return Number(fixture.languageServiceHost.getProjectVersion!())
    },
    readFile,
    fileExists: (fileName: string) => readFile(fileName) !== undefined,
  }
  const snapshots = new Map<string, string>()
  const language = createLanguage<URI>(
    [createMpxLanguagePlugin(ts, compilerOptions, options, uri => uri.fsPath)],
    createUriMap(),
    uri => {
      const content = readFile(uri.fsPath)
      if (content !== undefined && snapshots.get(uri.toString()) !== content) {
        snapshots.set(uri.toString(), content)
        language.scripts.set(
          uri,
          ts.ScriptSnapshot.fromString(content),
          uri.fsPath.endsWith('.mpx') ? 'mpx' : 'typescript',
        )
      }
    },
  )
  const { languageServiceHost, getExtraServiceScript } =
    createLanguageServiceHost(
      ts,
      sys,
      language,
      fileName => URI.file(fileName),
      {
        getCurrentDirectory: () => fixtureRoot,
        getCompilationSettings: () => compilerOptions,
        getProjectVersion: () =>
          fixture.languageServiceHost.getProjectVersion!(),
        getScriptFileNames: () =>
          fixture.languageServiceHost.getScriptFileNames(),
      },
    )
  const project = {
    typescript: {
      configFileName: path.join(fixtureRoot, 'tsconfig.json'),
      sys,
      languageServiceHost,
      getExtraServiceScript,
      uriConverter: {
        asUri: (fileName: string) => URI.file(fileName),
        asFileName: (uri: URI) => uri.fsPath,
      },
    },
  }
  const env = { workspaceFolders: [URI.file(fixtureRoot)] }
  const fixed = createLanguageService(
    language,
    [
      createSemanticPlugin(ts, { disableAutoImportCache: true }),
      createInstanceFieldPlugin(ts),
    ],
    env,
    project,
  )
  return {
    fixture,
    fixed,
    dispose() {
      fixed.dispose()
      fixture.dispose()
    },
  }
}

it('returns standalone warnings and related locations in original user documents', async () => {
  const service = createServices()
  try {
    const uri = URI.file(service.fixture.file('index.mpx'))
    const diagnostics = await service.fixed.getDiagnostics(uri)
    const warnings = diagnostics.filter(d => d.code === 5001)
    expect(warnings).toHaveLength(4)
    expect(diagnostics).toHaveLength(4)
    for (const warning of warnings) {
      expect(warning.severity).toBe(2)
      expect(warning.source).toBe('mpx')
      expect(warning.relatedInformation?.length).toBeGreaterThan(0)
      for (const info of warning.relatedInformation!) {
        expect(info.location.uri).toBe(uri.toString())
        expect(info.location.range.start.line).toBeGreaterThan(2)
      }
    }
    const typed = await service.fixed.getDiagnostics(
      URI.file(service.fixture.file('typed.mpx')),
    )
    const conflicts = typed.filter(d => d.code === 5001)
    expect(conflicts).toHaveLength(2)
    expect(
      conflicts
        .flatMap(d => d.relatedInformation ?? [])
        .some(info => info.location.uri.endsWith('/types.ts')),
    ).toBe(true)
    expect(
      (
        await service.fixed.getDiagnostics(
          URI.file(service.fixture.file('safe.mpx')),
        )
      ).filter(d => d.code === 5001),
    ).toEqual([])
  } finally {
    service.dispose()
  }
})

it('refreshes standalone warnings after local and imported-type edits without restarting', async () => {
  const service = createServices()
  const uri = URI.file(service.fixture.file('typed.mpx'))
  const warnings = async () =>
    (await service.fixed.getDiagnostics(uri)).filter(d => d.code === 5001)
  try {
    expect(await warnings()).toHaveLength(2)
    const types = service.fixture.read('types.ts')
    service.fixture.updateFile(
      'types.ts',
      types.replace('title: string', 'renamed: string'),
    )
    const changed = await warnings()
    expect(changed).toHaveLength(1)
    service.fixture.updateFile('types.ts', '// 类型声明移动\n' + types)
    const restored = await warnings()
    expect(restored).toHaveLength(2)
    const related = restored
      .flatMap(d => d.relatedInformation ?? [])
      .find(info => info.location.uri.endsWith('/types.ts'))!
    expect(related.location.range.start.line).toBe(2)
    const text = service.fixture.read('typed.mpx')
    service.fixture.updateFile('typed.mpx', '<!-- 编辑后的位移 -->\n' + text)
    const shifted = await warnings()
    expect(shifted).toHaveLength(2)
    expect(shifted.map(d => d.range.start.line).sort((a, b) => a - b)).toEqual(
      restored.map(d => d.range.start.line + 1).sort((a, b) => a - b),
    )
    for (const warning of shifted) expect(warning.severity).toBe(2)
  } finally {
    service.dispose()
  }
})
