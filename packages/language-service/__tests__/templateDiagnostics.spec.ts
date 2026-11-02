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
  type Code,
  type MpxLanguagePlugin,
  createLanguage,
  createMpxLanguagePlugin,
} from '../../language-core/src'
import { createLanguageServiceHost } from '@volar/typescript'
import { create as createBaseSemanticPlugin } from 'volar-service-typescript/lib/plugins/semantic'
import { create as createSemanticPlugin } from '../src/plugins/typescript-semantic'
import { withDiagnosticLocale } from '../../language-core/__tests__/utils/withDiagnosticLocale'
import {
  type TestLanguageService,
  createTestLanguageService,
} from '../../language-core/__tests__/utils/createTestLanguageService'

const fixtureRoot = path.resolve(
  __dirname,
  '../../language-core/__tests__/fixtures/template-diagnostics',
)

type VerificationCall = [
  source: string | undefined,
  code: string | number | undefined,
]

function createServices(onVerification?: (...args: VerificationCall) => void) {
  const fixture = createTestLanguageService(fixtureRoot, [
    path.join(fixtureRoot, 'control.ts.fixture'),
  ])
  const compilerOptions = fixture.languageServiceHost.getCompilationSettings()
  const mpxOptions =
    fixture.getServiceScript('index.mpx').root.mpxCompilerOptions
  const observer: MpxLanguagePlugin = () => ({
    name: 'test-verification-observer',
    order: 100,
    resolveEmbeddedCode(_fileName, _sfc, embedded) {
      embedded.content = embedded.content.map<Code>(segment => {
        if (typeof segment === 'string' || !segment[3].verification)
          return segment
        const verification = segment[3].verification
        return [
          segment[0],
          segment[1],
          segment[2],
          {
            ...segment[3],
            verification: {
              shouldReport(source, code) {
                onVerification!(source, code)
                return typeof verification === 'object'
                  ? (verification.shouldReport?.(source, code) ?? true)
                  : verification
              },
            },
          },
        ]
      })
    },
  })
  const options = onVerification
    ? { ...mpxOptions, plugins: [...mpxOptions.plugins, observer] }
    : mpxOptions
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
    [createMpxLanguagePlugin(ts, compilerOptions, options, uri => uri.fsPath)],
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
  const original = createLanguageService(
    language,
    [createBaseSemanticPlugin(ts, { disableAutoImportCache: true })],
    env,
    project,
  )
  const fixed = createLanguageService(
    language,
    [createSemanticPlugin(ts, { disableAutoImportCache: true })],
    env,
    project,
  )
  return {
    fixture,
    original,
    fixed,
    dispose() {
      original.dispose()
      fixed.dispose()
      fixture.dispose()
    },
  }
}

describe('standalone template diagnostic messages', () => {
  let fixture: TestLanguageService
  let original: LanguageService
  let fixed: LanguageService

  beforeAll(() => {
    ;({ fixture, original, fixed } = createServices())
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

  it('preserves real TS2339 user literal types and their mapped ranges', async () => {
    const uri = URI.file(fixture.file('literal-types.mpx'))
    const before = await original.getDiagnostics(uri)
    expect(before.map(d => d.code)).toEqual([2339, 2339])
    expect(before.some(d => d.message.includes("'__MPX_ctx.missing'"))).toBe(
      true,
    )
    expect(
      before.some(d => d.message.includes("'__MPX_dollars.missing'")),
    ).toBe(true)
    expect(await fixed.getDiagnostics(uri)).toEqual(before)
  })

  it.each(['en', 'zh-cn'] as const)(
    'restores real %s TS18049 messages without changing diagnostic metadata',
    locale =>
      withDiagnosticLocale(locale, async () => {
        const services = createServices()
        try {
          const uri = URI.file(services.fixture.file('index.mpx'))
          const before = await services.original.getDiagnostics(uri)
          const result = await services.fixed.getDiagnostics(uri)
          expect(result).toHaveLength(before.length)
          result.forEach((diagnostic, index) =>
            expect({ ...diagnostic, message: before[index].message }).toEqual(
              before[index],
            ),
          )
          const raw = before.find(d => d.code === 18049)!
          const diagnostic = result.find(d => d.code === 18049)!
          expect(diagnostic.message).toBe(
            raw.message.replace('__MPX_ctx.nullishUser', 'nullishUser'),
          )
          if (locale === 'zh-cn')
            expect(diagnostic.message).toMatch(/^nullishUser可能为/)
        } finally {
          services.dispose()
        }
      }),
  )

  it('leaves diagnostic suppression and verification callback invocations to the original mapper', async () => {
    const calls: VerificationCall[] = []
    const services = createServices((...args) => calls.push(args))
    try {
      const uri = URI.file(services.fixture.file('directives.mpx'))
      const before = await services.original.getDiagnostics(uri)
      const originalCalls = calls.splice(0)
      expect(originalCalls.length).toBeGreaterThan(0)
      const result = await services.fixed.getDiagnostics(uri)
      expect(calls).toEqual(originalCalls)
      expect(result.map(d => d.code).sort()).toEqual([18048, 2578])
      expect(result).toHaveLength(before.length)
      result.forEach((diagnostic, index) =>
        expect({ ...diagnostic, message: before[index].message }).toEqual(
          before[index],
        ),
      )
    } finally {
      services.dispose()
    }
  })
})
