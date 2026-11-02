import path from 'node:path'
import * as ts from 'typescript'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { compileMpxFixture } from './utils/compileMpxFixture'
import {
  type TestLanguageService,
  createTestLanguageService,
} from './utils/createTestLanguageService'

const fixtureRoot = path.resolve(__dirname, 'fixtures/template-completion')
const expectedVariables = [
  'propTitle',
  'exposedCount',
  'profile',
  'exposedTap',
  'publicName',
  'hookTitle',
  'hookProfile',
]

describe('template variable completions', () => {
  let service: TestLanguageService
  beforeAll(() => {
    service = createTestLanguageService(fixtureRoot)
  })
  afterAll(() => service.dispose())

  it.each([
    ['{{ propTitle }}', 3, 3],
    ['{{propTitle}}', 2, 2],
    ['{{propTitle+hookTitle}}', 12, 12],
    ['{{ propTitle }}', 4, 3],
    ['{{ propTitle }}', 12, 3],
    ['{{ exposedCount }}', 3, 3],
    ['{{ hookTitle }}', 3, 3],
    ['propTitle + hookTitle', 12, 12],
    ['bindtap="exposedTap"', 9, 9],
  ] as const)(
    'completes template sources at %s + %i',
    (needle, delta, identifierOffset) => {
      const source = service.read('index.mpx')
      const position = source.indexOf(needle) + delta
      const result = service.proxyLanguageService.getCompletionsAtPosition(
        service.file('index.mpx'),
        position,
        {},
      )
      const names = result?.entries.map(entry => entry.name)
      expect(names).toEqual(expect.arrayContaining(expectedVariables))
      expect(names).not.toContain('privateValue')
      const start = source.indexOf(needle) + identifierOffset
      const length = source.slice(start).match(/^\w+/)![0].length
      expect(result?.optionalReplacementSpan).toEqual({ start, length })
    },
  )

  it.each([
    ['{{ profile.name }}', 'name', 11],
    ['{{ hookProfile.age }}', 'age', 15],
  ] as const)('keeps member completion in %s', (needle, member, delta) => {
    const source = service.read('index.mpx')
    const result = service.proxyLanguageService.getCompletionsAtPosition(
      service.file('index.mpx'),
      source.indexOf(needle) + delta,
      {},
    )
    expect(result?.entries.map(entry => entry.name)).toContain(member)
  })

  it.each(['{{ propTitle }}', '{{ exposedCount }}', '{{ hookTitle }}'])(
    'preserves hover and source definitions for %s',
    needle => {
      const source = service.read('index.mpx')
      const file = service.file('index.mpx')
      const position = source.indexOf(needle) + 4
      const info = service.proxyLanguageService.getQuickInfoAtPosition(
        file,
        position,
      )
      expect(ts.displayPartsToString(info?.displayParts)).toMatch(
        /string|number/,
      )
      expect(
        service.proxyLanguageService.getDefinitionAtPosition(file, position),
      ).toEqual(
        expect.arrayContaining([expect.objectContaining({ fileName: file })]),
      )
    },
  )

  it.each([
    ['{{  }}', 3],
    ['title="{{  }}"', 10],
    ['bindtap=""', 9],
  ] as const)('completes an unfinished expression at %s', (needle, delta) => {
    const source = service.read('editing.mpx')
    const result = service.proxyLanguageService.getCompletionsAtPosition(
      service.file('editing.mpx'),
      source.indexOf(needle) + delta,
      {},
    )
    expect(result?.entries.map(entry => entry.name)).toEqual(
      expect.arrayContaining(['propTitle', 'exposedTap', 'hookTitle']),
    )
  })

  it.each([
    'index.mpx',
    'typed-props.mpx',
    'javascript.mpx',
    'native-attributes.mpx',
  ])('keeps valid Mpx syntax and types in %s', async file => {
    expect(
      service.proxyLanguageService.getSemanticDiagnostics(service.file(file)),
    ).toEqual([])
    expect((await compileMpxFixture(service.file(file))).code).toContain(
      'createComponent',
    )
  })

  it.each(['typed-props.mpx', 'javascript.mpx'])(
    'completes typed defaults and exposed aliases in %s',
    file => {
      const source = service.read(file)
      const result = service.proxyLanguageService.getCompletionsAtPosition(
        service.file(file),
        source.indexOf('{{ title }}') + 3,
        {},
      )
      const names = result?.entries.map(entry => entry.name)
      expect(names).toEqual(
        expect.arrayContaining(['title', 'publicCount', 'hookTitle']),
      )
      expect(names).not.toContain('localCount')
    },
  )

  it.each([
    ['enable-text-pass-through', 'boolean'],
    ['is-svg', 'boolean'],
    ['keyboard-type', 'string'],
    ['workletChange', 'x: number'],
  ])('preserves generated native attribute types for %s', (attribute, type) => {
    const source = service.read('native-attributes.mpx')
    const file = service.file('native-attributes.mpx')
    const info = service.proxyLanguageService.getQuickInfoAtPosition(
      file,
      source.indexOf(attribute) + 1,
    )
    expect(ts.displayPartsToString(info?.displayParts)).toContain(type)
  })

  it('retains errors for unwrapped members', () => {
    const diagnostics = service.proxyLanguageService.getSemanticDiagnostics(
      service.file('errors.mpx'),
    )
    expect(diagnostics.map(diagnostic => diagnostic.code)).toEqual([2339])
  })
})
