import path from 'node:path'
import * as ts from 'typescript'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import {
  type TestLanguageService,
  createTestLanguageService,
} from './utils/createTestLanguageService'

describe('template context with index-signature mixins and options', () => {
  let service: TestLanguageService

  beforeAll(() => {
    service = createTestLanguageService(
      path.resolve(__dirname, 'fixtures/template-context-index-signature'),
    )
  })

  afterAll(() => {
    service.dispose()
  })

  it('preserves template types, definitions, and field-level conflicts with index-signature sources', () => {
    const relativePath = 'page-with-index-signature-mixin.mpx'
    const fileName = service.file(relativePath)
    const source = service.read(relativePath)
    const storeFile = service.file('store.ts')
    const storeSource = service.read('store.ts')
    const mixinsFile = service.file('mixins.ts')
    const mixinsSource = service.read('mixins.ts')

    const expectedTypes: [string, string][] = [
      ['showFallback', '(property) showFallback: boolean'],
      ['localTitle', '(property) localTitle: string'],
      ['statusText', '(property) statusText: "fallback" | "active"'],
      ['displayLabel', '(property) displayLabel: string'],
      ['handleReset', '(method) handleReset(): string'],
      ['fromMixinData', '(property) fromMixinData: string'],
      ['fromMixinComputed', '(property) fromMixinComputed: boolean'],
      ['fromMixinMethod', '(method) fromMixinMethod(): number'],
      ['fromFnMixin', '(property) fromFnMixin: number'],
      ['setupBadge', '(property) setupBadge: string'],
      ['refreshData', '(method) refreshData(): Promise<string>'],
      ['_concreteInternal', '(property) _concreteInternal: number'],
    ]

    for (const [name, expected] of expectedTypes) {
      const position = source.indexOf(name) + 1
      const quickInfo = service.proxyLanguageService.getQuickInfoAtPosition(
        fileName,
        position,
      )
      expect(ts.displayPartsToString(quickInfo?.displayParts)).toBe(expected)
    }

    const expectedDefinitions: [string, string, string, string][] = [
      ['showFallback', storeFile, storeSource, 'showFallback: boolean'],
      ['statusText', storeFile, storeSource, 'statusText():'],
      ['refreshData', storeFile, storeSource, 'refreshData():'],
      ['localTitle', fileName, source, 'localTitle: string'],
      ['displayLabel', fileName, source, 'displayLabel()'],
      ['handleReset', fileName, source, 'handleReset()'],
      [
        'fromMixinData',
        mixinsFile,
        mixinsSource,
        "fromMixinData: 'mixin-text'",
      ],
      ['fromMixinComputed', mixinsFile, mixinsSource, 'fromMixinComputed():'],
      ['fromMixinMethod', mixinsFile, mixinsSource, 'fromMixinMethod():'],
      ['fromFnMixin', mixinsFile, mixinsSource, 'fromFnMixin: 42'],
      ['setupBadge', fileName, source, 'setupBadge: Ref<string>'],
      ['_concreteInternal', fileName, source, '_concreteInternal: number'],
    ]

    for (const [
      name,
      targetFile,
      targetSource,
      marker,
    ] of expectedDefinitions) {
      const position = source.indexOf(name) + 1
      const definitions = service.proxyLanguageService.getDefinitionAtPosition(
        fileName,
        position,
      )
      expect(definitions?.length).toBeGreaterThan(0)
      expect(definitions).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            fileName: targetFile,
            textSpan: {
              start: targetSource.indexOf(marker) + marker.indexOf(name),
              length: name.length,
            },
          }),
        ]),
      )
    }

    const diagnostics = service.proxyLanguageService
      .getSemanticDiagnostics(fileName)
      .map(diagnostic => ({
        code: diagnostic.code,
        message: ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n'),
      }))

    expect(diagnostics).toEqual([
      {
        code: 2339,
        message: "Property 'nonExistent' does not exist on type 'string'.",
      },
      {
        code: 2339,
        message: "Property 'toFixed' does not exist on type 'never'.",
      },
    ])
  })

  it('preserves public instance methods, prop checking, and ref navigation for options children with index-signature mixins', () => {
    const childPath = 'options-child-with-mixin.mpx'
    const childFile = service.file(childPath)
    const childSource = service.read(childPath)
    const parentPath = 'ref-parent.mpx'
    const parentFile = service.file(parentPath)
    const parentSource = service.read(parentPath)

    expect(
      service.proxyLanguageService.getSemanticDiagnostics(childFile),
    ).toEqual([])
    const labelHover = service.proxyLanguageService.getQuickInfoAtPosition(
      childFile,
      childSource.indexOf('label.toUpperCase') + 1,
    )
    expect(ts.displayPartsToString(labelHover?.displayParts)).toBe(
      '(property) label: string',
    )

    const focusedHover = service.proxyLanguageService.getQuickInfoAtPosition(
      parentFile,
      parentSource.indexOf('const focusedId') + 'const '.length + 1,
    )
    expect(ts.displayPartsToString(focusedHover?.displayParts)).toBe(
      'const focusedId: number | undefined',
    )

    const definitions = service.proxyLanguageService.getDefinitionAtPosition(
      parentFile,
      parentSource.indexOf('.focusInput') + 2,
    )
    expect(definitions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          fileName: childFile,
          textSpan: {
            start: childSource.indexOf('focusInput(id: number)'),
            length: 'focusInput'.length,
          },
        }),
      ]),
    )

    const diagnostics = service.proxyLanguageService
      .getSemanticDiagnostics(parentFile)
      .map(diagnostic => diagnostic.code)
    expect(diagnostics).toEqual([2345, 2322])
  })

  it('preserves typed mixin fields alongside loose index-signature mixins in script setup defineOptions', () => {
    const relativePath = 'script-setup-loose-mixin.mpx'
    const fileName = service.file(relativePath)
    const source = service.read(relativePath)
    const mixinsFile = service.file('mixins.ts')
    const mixinsSource = service.read('mixins.ts')

    expect(
      service.proxyLanguageService.getSemanticDiagnostics(fileName),
    ).toEqual([])

    for (const [name, expected] of [
      ['title', '(property) title: string'],
      ['fromMixinData', '(property) fromMixinData: string'],
      ['fromMixinComputed', '(property) fromMixinComputed: boolean'],
      ['fromMixinMethod', '(method) fromMixinMethod(): number'],
    ] as const) {
      const hover = service.proxyLanguageService.getQuickInfoAtPosition(
        fileName,
        source.indexOf(name) + 1,
      )
      expect(ts.displayPartsToString(hover?.displayParts)).toBe(expected)
    }

    const definitions = service.proxyLanguageService.getDefinitionAtPosition(
      fileName,
      source.indexOf('fromMixinComputed') + 1,
    )
    expect(definitions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          fileName: mixinsFile,
          textSpan: {
            start: mixinsSource.indexOf('fromMixinComputed():'),
            length: 'fromMixinComputed'.length,
          },
        }),
      ]),
    )
  })

  it('supports conditional mixin arrays with index-signature mixins', () => {
    const relativePath = 'conditional-mixins-page.mpx'
    const fileName = service.file(relativePath)
    const source = service.read(relativePath)

    expect(
      service.proxyLanguageService.getSemanticDiagnostics(fileName),
    ).toEqual([])
    const mixinHover = service.proxyLanguageService.getQuickInfoAtPosition(
      fileName,
      source.indexOf('fromMixinData') + 1,
    )
    expect(ts.displayPartsToString(mixinHover?.displayParts)).toBe(
      '(property) fromMixinData: string',
    )
    const localHover = service.proxyLanguageService.getQuickInfoAtPosition(
      fileName,
      source.indexOf('localName') + 1,
    )
    expect(ts.displayPartsToString(localHover?.displayParts)).toBe(
      '(property) localName: string',
    )
  })
})
