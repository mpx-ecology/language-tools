import { createRequire } from 'node:module'
import path from 'node:path'
import * as ts from 'typescript'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import {
  type TestLanguageService,
  createTestLanguageService,
} from './utils/createTestLanguageService'

const fixtureRoot = path.resolve(__dirname, 'fixtures/vue-macro-coexistence')
const requireFromTest = createRequire(__filename)
const mpxPackage = requireFromTest.resolve('@mpxjs/core/package.json')
const mpxTypes = path.join(path.dirname(mpxPackage), '@types/index.d.ts')
// Use the actual Vue 2.7 peer bundled with the test runtime, not mock signatures
// or files from the mutable inspect-extension workspace.
const vuePackage = createRequire(mpxPackage).resolve('vue/package.json')
const vueTypes = path.join(path.dirname(vuePackage), 'types/index.d.ts')

describe.each([
  ['Mpx only', []],
  ['Mpx before Vue', [mpxTypes, vueTypes]],
  ['Vue before Mpx', [vueTypes, mpxTypes]],
] as const)('setup macros: %s', (_label, additionalRootFiles) => {
  let service: TestLanguageService

  beforeAll(() => {
    service = createTestLanguageService(fixtureRoot, [
      ...additionalRootFiles,
      path.join(fixtureRoot, 'ambient-control.ts'),
    ])
  })
  afterAll(() => service.dispose())

  it.each([
    'runtime-props.mpx',
    'typed-defaults.mpx',
    'runtime-props-js.mpx',
    'destructured.mpx',
    'both-scripts.mpx',
    'macro-aliases.mpx',
    'imported-macros.mpx',
  ])('keeps valid Mpx props typed in %s', relativePath => {
    const fileName = service.file(relativePath)
    const diagnostics = [
      ...service.proxyLanguageService.getSyntacticDiagnostics(fileName),
      ...service.proxyLanguageService.getSemanticDiagnostics(fileName),
    ]
    expect(
      diagnostics.map(diagnostic => ({
        code: diagnostic.code,
        message: ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n'),
      })),
    ).toEqual([])
  })

  it('preserves Mpx runtime prop hover types and member completions', () => {
    const relativePath = 'runtime-props.mpx'
    const fileName = service.file(relativePath)
    const source = service.read(relativePath)
    const position = source.indexOf('props.title.toUpperCase') + 'props.'.length
    const info = service.proxyLanguageService.getQuickInfoAtPosition(
      fileName,
      position,
    )
    expect(ts.displayPartsToString(info?.displayParts)).toBe(
      '(property) title: string',
    )

    const memberPosition =
      source.indexOf('props.profile.name') + 'props.profile.'.length
    const completions = service.proxyLanguageService.getCompletionsAtPosition(
      fileName,
      memberPosition,
      {},
    )
    expect(completions?.entries.map(entry => entry.name)).toContain('name')
  })

  it('preserves typed default hover information and source definitions', () => {
    const relativePath = 'typed-defaults.mpx'
    const fileName = service.file(relativePath)
    const source = service.read(relativePath)
    const titlePosition =
      source.indexOf('props.title.toUpperCase') + 'props.'.length
    const info = service.proxyLanguageService.getQuickInfoAtPosition(
      fileName,
      titlePosition,
    )
    expect(ts.displayPartsToString(info?.displayParts)).toBe(
      '(property) title: string',
    )

    const namePosition =
      source.indexOf('props.profile.name') + 'props.profile.'.length
    const definitions = service.proxyLanguageService.getDefinitionAtPosition(
      fileName,
      namePosition,
    )
    expect(definitions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          fileName,
          textSpan: { start: source.indexOf('name: string'), length: 4 },
        }),
      ]),
    )
  })

  it('retains errors for incorrect prop uses and defaults', () => {
    const codes = service.proxyLanguageService
      .getSemanticDiagnostics(service.file('invalid-props.mpx'))
      .map(diagnostic => diagnostic.code)
    expect(codes).toEqual([2322, 2540, 2339])
    const defaults = service.proxyLanguageService.getSemanticDiagnostics(
      service.file('invalid-defaults.mpx'),
    )
    expect(defaults.map(diagnostic => diagnostic.code)).toEqual([2322])
  })

  it('does not change the ambient macro in ordinary TypeScript modules', () => {
    const relativePath = 'ambient-control.ts'
    const source = service.read(relativePath)
    const position = source.indexOf('ambient.title') + 'ambient.'.length
    const info = service.proxyLanguageService.getQuickInfoAtPosition(
      service.file(relativePath),
      position,
    )
    expect(ts.displayPartsToString(info?.displayParts)).toBe(
      _label === 'Vue before Mpx'
        ? '(property) title?: string | undefined'
        : '(property) title: string',
    )
  })
})
