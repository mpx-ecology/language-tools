import path from 'node:path'
import * as ts from 'typescript'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { URI } from 'vscode-uri'
import {
  type LanguageService,
  createLanguageService,
  createUriMap,
} from '@volar/language-service'
import {
  createLanguage,
  createMpxLanguagePlugin,
} from '../../language-core/src'
import { createLanguageServiceHost } from '@volar/typescript'
import { create as createBaseSemanticPlugin } from 'volar-service-typescript/lib/plugins/semantic'
import { create as createSemanticPlugin } from '../src/plugins/typescript-semantic'
import {
  type TestLanguageService,
  createTestLanguageService,
} from '../../language-core/__tests__/utils/createTestLanguageService'

const fixtureRoot = path.resolve(
  __dirname,
  '../../language-core/__tests__/fixtures/template-diagnostics',
)

describe('standalone template diagnostic messages', () => {
  let fixture: TestLanguageService
  let original: LanguageService
  let fixed: LanguageService

  beforeAll(() => {
    fixture = createTestLanguageService(fixtureRoot, [
      path.join(fixtureRoot, 'control.ts.fixture'),
    ])
    const compilerOptions = fixture.languageServiceHost.getCompilationSettings()
    const mpxOptions =
      fixture.getServiceScript('index.mpx').root.mpxCompilerOptions
    const readFile = (fileName: string) => {
      const snapshot = fileName.endsWith('.mpx')
        ? fixture.language.scripts.get(fileName)?.snapshot
        : fixture.languageServiceHost.getScriptSnapshot(fileName)
      return snapshot?.getText(0, snapshot.getLength())
    }
    const sys = {
      ...ts.sys,
      readFile,
      fileExists: (fileName: string) => readFile(fileName) !== undefined,
    }
    const language = createLanguage<URI>(
      [
        createMpxLanguagePlugin(
          ts,
          compilerOptions,
          mpxOptions,
          uri => uri.fsPath,
        ),
      ],
      createUriMap(),
      uri => {
        const content = readFile(uri.fsPath)
        if (content !== undefined)
          language.scripts.set(
            uri,
            ts.ScriptSnapshot.fromString(content),
            uri.fsPath.endsWith('.mpx') ? 'mpx' : 'typescript',
          )
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
    original = createLanguageService(
      language,
      [createBaseSemanticPlugin(ts, { disableAutoImportCache: true })],
      env,
      project,
    )
    fixed = createLanguageService(
      language,
      [createSemanticPlugin(ts, { disableAutoImportCache: true })],
      env,
      project,
    )
  })

  afterAll(() => {
    original?.dispose()
    fixed?.dispose()
    fixture?.dispose()
  })

  it('returns clean messages at original template ranges and preserves all other diagnostic fields', async () => {
    const uri = URI.file(fixture.file('index.mpx'))
    const before = await original.getDiagnostics(uri)
    const result = await fixed.getDiagnostics(uri)
    expect(before.some(d => d.message.includes('__MPX_ctx.optionalUser'))).toBe(
      true,
    )
    expect(result).toHaveLength(before.length)
    for (let index = 0; index < result.length; index++) {
      expect({ ...result[index], message: before[index].message }).toEqual(
        before[index],
      )
    }
    expect(result.map(({ code, message }) => ({ code, message }))).toEqual(
      expect.arrayContaining([
        { code: 18048, message: "'optionalUser' is possibly 'undefined'." },
        { code: 18047, message: "'nullableUser' is possibly 'null'." },
        {
          code: 18049,
          message: "'nullishUser' is possibly 'null' or 'undefined'.",
        },
        { code: 18046, message: "'unknownValue' is of type 'unknown'." },
      ]),
    )
    expect(result.filter(d => d.range.start.line >= 12)).toEqual(
      before.filter(d => d.range.start.line >= 12),
    )
  })

  it('preserves ordinary TypeScript diagnostics', async () => {
    const uri = URI.file(fixture.file('control.ts.fixture'))
    const before = await original.getDiagnostics(uri)
    expect(before.some(d => d.message.includes('__MPX_ctx.user'))).toBe(true)
    expect(await fixed.getDiagnostics(uri)).toEqual(before)
  })
})
