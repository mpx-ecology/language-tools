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
    'scoped.mpx',
    'capture-events.mpx',
    'loose-hooks.mpx',
    'loose-hooks-js.mpx',
  ])('keeps valid Mpx syntax and types in %s', async file => {
    expect(
      service.proxyLanguageService
        .getSemanticDiagnostics(service.file(file))
        .map(diagnostic => ({
          code: diagnostic.code,
          message: ts.flattenDiagnosticMessageText(
            diagnostic.messageText,
            '\n',
          ),
        })),
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

  it.each([
    ['{{ propTitle }}', 3, ['row', 'rowIndex']],
    ['{{ defaultTitle }}', 3, ['item', 'index']],
    ['{{ propTitle }}', 4, ['row', 'rowIndex']],
    ['{{ propTitle }}', 12, ['row', 'rowIndex']],
    ['{{ row.id }}', 3, ['row', 'rowIndex']],
    ['{{ nestedTitle }}', 3, ['row', 'rowIndex', 'child', 'childIndex']],
    ['{{ shadowTitle }}', 3, ['row', 'rowIndex', 'innerIndex']],
    ['handleTap($event, row)', 0, ['row', 'rowIndex', '$event']],
    ['handleTap($event, row)', 10, ['row', 'rowIndex', '$event']],
  ] as const)('keeps template locals at %s + %i', (needle, delta, locals) => {
    const file = service.file('scoped.mpx')
    const source = service.read('scoped.mpx')
    const result = service.proxyLanguageService.getCompletionsAtPosition(
      file,
      source.indexOf(needle) + delta,
      {},
    )
    const names = result?.entries.map(entry => entry.name)
    expect(names).toEqual(
      expect.arrayContaining(['propTitle', 'rows', 'handleTap', ...locals]),
    )
    expect(names).not.toContain('privateValue')
    expect(names?.filter(name => name === 'row')).toHaveLength(1)
    if (!needle.startsWith('handleTap')) expect(names).not.toContain('$event')
    if (needle.includes('shadowTitle')) expect(names).not.toContain('child')
  })

  it.each([
    ['{{  }}', 3, ['row', 'rowIndex', 'rows', 'handleTap']],
    ['{{row.}}', 6, ['id', 'children']],
    ['handleTap(row.)', 14, ['id', 'children']],
    ['bindtap=""', 9, ['row', 'rowIndex', 'rows', 'handleTap']],
  ] as const)(
    'completes unfinished scoped expression %s',
    (needle, delta, expected) => {
      const file = service.file('scoped-editing.mpx')
      const source = service.read('scoped-editing.mpx')
      const result = service.proxyLanguageService.getCompletionsAtPosition(
        file,
        source.indexOf(needle) + delta,
        {},
      )
      expect(result?.entries.map(entry => entry.name)).toEqual(
        expect.arrayContaining([...expected]),
      )
    },
  )

  it.each([
    ['{{ propTitle }}', true],
    ['{{ shadowTitle }}', false],
  ])(
    'uses the closest row type in completion details at %s',
    (needle, hasChildren) => {
      const file = service.file('scoped.mpx')
      const source = service.read('scoped.mpx')
      const details = service.proxyLanguageService.getCompletionEntryDetails(
        file,
        source.indexOf(needle as string) + 3,
        'row',
        {},
        undefined,
        {},
        undefined,
      )
      const display = ts.displayPartsToString(details?.displayParts)
      expect(display).toContain('id: string')
      expect(display.includes('children')).toBe(hasChildren)
    },
  )

  it('keeps the outside row type and local source navigation', () => {
    const file = service.file('scoped.mpx')
    const source = service.read('scoped.mpx')
    const details = service.proxyLanguageService.getCompletionEntryDetails(
      file,
      source.indexOf('{{ outsideTitle }}') + 3,
      'row',
      {},
      undefined,
      {},
      undefined,
    )
    expect(ts.displayPartsToString(details?.displayParts)).toBe(
      '(property) row: \"outside\"',
    )
    const position = source.indexOf('{{ row.id }}') + 4
    const info = service.proxyLanguageService.getQuickInfoAtPosition(
      file,
      position,
    )
    expect(ts.displayPartsToString(info?.displayParts)).toContain('children')
    const alias = source.indexOf('wx:for-item="row"') + 'wx:for-item="'.length
    expect(
      service.proxyLanguageService.getDefinitionAtPosition(file, position),
    ).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          fileName: file,
          textSpan: { start: alias, length: 3 },
        }),
      ]),
    )
  })

  it('resolves source completions before inner aliases shadow outer ones', () => {
    const file = service.file('scoped.mpx')
    const source = service.read('scoped.mpx')
    const position = source.indexOf('{{ row.children }}') + 3
    const result = service.proxyLanguageService.getCompletionsAtPosition(
      file,
      position,
      {},
    )
    const names = result?.entries.map(entry => entry.name)
    expect(names).toEqual(
      expect.arrayContaining(['row', 'rowIndex', 'propTitle']),
    )
    expect(names).not.toContain('child')
    expect(names).not.toContain('childIndex')
    const details = service.proxyLanguageService.getCompletionEntryDetails(
      file,
      position,
      'row',
      {},
      undefined,
      {},
      undefined,
    )
    expect(ts.displayPartsToString(details?.displayParts)).toContain('children')
  })

  it('keeps completion mappings independent from semantics and navigation', () => {
    const file = service.file('scoped.mpx')
    const source = service.read('scoped.mpx')
    const position = source.indexOf('{{ row.id }}') + 4
    const script = service.language.scripts.get(file)!
    const code = script.generated!.languagePlugin.typescript!.getServiceScript(
      script.generated!.root,
    )!.code
    const mappings = code.mappings.filter(mapping =>
      mapping.sourceOffsets.some(
        (offset, index) =>
          offset <= position && position < offset + mapping.lengths[index],
      ),
    )
    expect(mappings.filter(mapping => mapping.data.semantic)).toHaveLength(1)
    expect(mappings.filter(mapping => mapping.data.navigation)).toHaveLength(1)
    expect(
      mappings.some(
        mapping =>
          mapping.data.completion &&
          !mapping.data.semantic &&
          !mapping.data.navigation &&
          !mapping.data.verification,
      ),
    ).toBe(true)
  })

  it('does not leak nested or event locals after their scope', () => {
    const file = service.file('scoped.mpx')
    const source = service.read('scoped.mpx')
    const result = service.proxyLanguageService.getCompletionsAtPosition(
      file,
      source.indexOf('{{ outsideTitle }}') + 3,
      {},
    )
    const names = result?.entries.map(entry => entry.name)
    for (const name of [
      'rowIndex',
      'child',
      'childIndex',
      'innerIndex',
      '$event',
      'privateValue',
    ])
      expect(names).not.toContain(name)
  })

  it.each(['compactBind', 'compactCatch', 'colonBind', 'colonCatch'])(
    'keeps capture handler %s typed, navigable and completable',
    name => {
      const file = service.file('capture-events.mpx')
      const source = service.read('capture-events.mpx')
      const position = source.indexOf('"' + name + '"') + 2
      const info = service.proxyLanguageService.getQuickInfoAtPosition(
        file,
        position,
      )
      expect(ts.displayPartsToString(info?.displayParts)).toContain(
        '() => void',
      )
      expect(
        service.proxyLanguageService.getDefinitionAtPosition(file, position),
      ).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            fileName: file,
            textSpan: {
              start: source.indexOf(name, source.indexOf('defineExpose')),
              length: name.length,
            },
          }),
        ]),
      )
      const result = service.proxyLanguageService.getCompletionsAtPosition(
        file,
        position,
        {},
      )
      expect(result?.entries.map(entry => entry.name)).toEqual(
        expect.arrayContaining([
          'compactBind',
          'compactCatch',
          'colonBind',
          'colonCatch',
        ]),
      )
    },
  )

  describe.each(['loose-hooks.mpx', 'loose-hooks-js.mpx'])(
    'local completion with an any Hooks result in %s',
    file => {
      it.each([3, 4, 11])('keeps root locals at offset %i', delta => {
        const source = service.read(file)
        const position = source.indexOf('{{ rowIndex }}') + delta
        const result = service.proxyLanguageService.getCompletionsAtPosition(
          service.file(file),
          position,
          {},
        )
        const names = result?.entries.map(entry => entry.name)
        expect(names).toEqual(expect.arrayContaining(['row', 'rowIndex']))
        expect(names).not.toContain('privateValue')
        expect(names?.filter(name => name === 'rowIndex')).toHaveLength(1)
      })

      it('keeps nested and event locals in their own scopes', () => {
        const source = service.read(file)
        const nested = service.proxyLanguageService.getCompletionsAtPosition(
          service.file(file),
          source.indexOf('{{ nestedIndex }}') + 3,
          {},
        )
        expect(nested?.entries.map(entry => entry.name)).toEqual(
          expect.arrayContaining([
            'row',
            'rowIndex',
            'nestedRow',
            'nestedIndex',
          ]),
        )
        const event = service.proxyLanguageService.getCompletionsAtPosition(
          service.file(file),
          source.indexOf('onTap($event, rowIndex)') + 6,
          {},
        )
        expect(event?.entries.map(entry => entry.name)).toEqual(
          expect.arrayContaining(['$event', 'row', 'rowIndex']),
        )
        const outside = service.proxyLanguageService.getCompletionsAtPosition(
          service.file(file),
          source.indexOf('{{ outsideTitle }}') + 3,
          {},
        )
        for (const name of [
          'row',
          'rowIndex',
          'nestedRow',
          'nestedIndex',
          '$event',
          'privateValue',
        ])
          expect(outside?.entries.map(entry => entry.name) ?? []).not.toContain(
            name,
          )
      })

      it('retains the numeric index type, hover and source definition', () => {
        const source = service.read(file)
        const position = source.indexOf('{{ rowIndex }}') + 4
        const details = service.proxyLanguageService.getCompletionEntryDetails(
          service.file(file),
          position,
          'rowIndex',
          {},
          undefined,
          {},
          undefined,
        )
        expect(ts.displayPartsToString(details?.displayParts)).toContain(
          'rowIndex: number',
        )
        const info = service.proxyLanguageService.getQuickInfoAtPosition(
          service.file(file),
          position,
        )
        expect(ts.displayPartsToString(info?.displayParts)).toContain(
          'rowIndex: number',
        )
        const declaration =
          source.indexOf('wx:for-index="rowIndex"') + 'wx:for-index="'.length
        expect(
          service.proxyLanguageService.getDefinitionAtPosition(
            service.file(file),
            position,
          ),
        ).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              fileName: service.file(file),
              textSpan: { start: declaration, length: 8 },
            }),
          ]),
        )
      })
    },
  )

  it('keeps numeric local errors with an any template context', () => {
    const file = 'loose-hooks-errors.mpx'
    const source = service.read(file)
    const diagnostics = service.proxyLanguageService.getSemanticDiagnostics(
      service.file(file),
    )
    expect(diagnostics.map(diagnostic => diagnostic.code)).toEqual([2339])
    expect(
      source.slice(
        diagnostics[0].start!,
        diagnostics[0].start! + diagnostics[0].length!,
      ),
    ).toBe('missing')
  })

  it('retains errors for unwrapped members', () => {
    const diagnostics = service.proxyLanguageService.getSemanticDiagnostics(
      service.file('errors.mpx'),
    )
    expect(diagnostics.map(diagnostic => diagnostic.code)).toEqual([2339, 2339])
    const source = service.read('errors.mpx')
    expect(
      diagnostics.map(diagnostic =>
        source.slice(diagnostic.start!, diagnostic.start! + diagnostic.length!),
      ),
    ).toEqual(['missing', 'missingCapture'])
  })
})
