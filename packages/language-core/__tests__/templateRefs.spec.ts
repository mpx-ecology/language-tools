import path from 'node:path'
import type { VirtualCode } from '@volar/language-core'
import * as ts from 'typescript'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import {
  type TestLanguageService,
  createTestLanguageService,
} from './utils/createTestLanguageService'

describe('Mpx template refs', () => {
  let service: TestLanguageService
  beforeAll(() => {
    service = createTestLanguageService(
      path.resolve(__dirname, 'fixtures/template-refs'),
    )
  })
  afterAll(() => service.dispose())

  it('preserves exposed method and Options return types', () => {
    const source = service.read('index.mpx')
    for (const [name, type] of [
      ['result', 'Promise<number>'],
      ['found', 'number'],
    ]) {
      const info = service.proxyLanguageService.getQuickInfoAtPosition(
        service.file('index.mpx'),
        source.indexOf(name) + 1,
      )
      expect(ts.displayPartsToString(info?.displayParts)).toBe(
        `const ${name}: ${type}`,
      )
    }
  })

  it('checks arguments and hides private setup bindings', () => {
    const diagnostics = service.proxyLanguageService.getSemanticDiagnostics(
      service.file('index.mpx'),
    )
    expect(diagnostics.map(d => d.code)).toEqual([2345, 2339])
    expect(
      diagnostics.map(d => sourceText('index.mpx', d.start!, d.length!)),
    ).toEqual(["'bad'", 'privateMethod'])
  })

  it.each([
    ['loadMore', 'exposed-child.mpx', 'function loadMore'],
    ['find', 'options-child.mpx', 'find(name:'],
  ])(
    'navigates %s to the child source declaration',
    (method, child, marker) => {
      const position = service.read('index.mpx').indexOf(`.${method}`) + 2
      const definitions = service.proxyLanguageService.getDefinitionAtPosition(
        service.file('index.mpx'),
        position,
      )
      expect(definitions?.length).toBeGreaterThan(0)
      expect(
        definitions!.every(
          definition => definition.fileName === service.file(child),
        ),
      ).toBe(true)
      const childSource = service.read(child)
      expect(
        definitions!.every(definition =>
          childSource.slice(definition.textSpan.start).startsWith(method),
        ),
      ).toBe(true)
      expect(
        definitions!.some(
          definition =>
            definition.textSpan.start >= childSource.indexOf(marker) &&
            definition.textSpan.start <
              childSource.indexOf(marker) + marker.length,
        ),
      ).toBe(true)
      expect(
        new Set(definitions!.map(definition => definition.textSpan.start)).size,
      ).toBe(definitions!.length)
    },
  )

  it('keeps public method completions and documentation', () => {
    const position =
      service.read('index.mpx').indexOf('refs.child.loadMore') +
      'refs.child.'.length
    const completions = service.proxyLanguageService.getCompletionsAtPosition(
      service.file('index.mpx'),
      position,
      {},
    )
    expect(completions?.entries.map(entry => entry.name)).toEqual(
      expect.arrayContaining(['loadMore', 'count']),
    )
    expect(completions?.entries.map(entry => entry.name)).not.toContain(
      'privateMethod',
    )
    const hover = service.proxyLanguageService.getQuickInfoAtPosition(
      service.file('index.mpx'),
      position + 1,
    )
    expect(ts.displayPartsToString(hover?.displayParts)).toContain(
      '(page: number) => Promise<number>',
    )
    expect(ts.displayPartsToString(hover?.documentation)).toContain(
      '加载指定页',
    )
  })

  it.each([
    ['context-js.mpx', 'Promise<number> | undefined'],
    ['setup-options-parent.mpx', 'number | undefined'],
  ])('supports context objects and public types in %s', (file, type) => {
    expect(hover(file, 'result')).toBe(`const result: ${type}`)
    const diagnostics = service.proxyLanguageService.getSemanticDiagnostics(
      service.file(file),
    )
    expect(diagnostics.map(d => d.code)).toEqual([2345])
  })

  it('uses Mpx component arrays and NodesRef queries inside loops', () => {
    expect(hover('shapes.mpx', 'childResult')).toBe(
      'const childResult: Promise<number>',
    )
    expect(hover('shapes.mpx', 'node')).toContain('WechatMiniprogram.NodesRef')
    expect(hover('shapes.mpx', 'nodes')).toContain('WechatMiniprogram.NodesRef')
    const diagnostics = service.proxyLanguageService.getSemanticDiagnostics(
      service.file('shapes.mpx'),
    )
    expect(diagnostics.map(d => d.code)).toEqual([
      18049, 2339, 2345, 2339, 18049, 2339,
    ])
  })

  it('supports non-identifier ref names without inventing dynamic or empty keys', () => {
    expect(hover('shapes.mpx', 'namedResult')).toBe(
      'const namedResult: Promise<number> | undefined',
    )
    expect(hover('shapes.mpx', 'keywordResult')).toBe(
      'const keywordResult: Promise<number> | undefined',
    )
    const source = service.read('shapes.mpx')
    const completions = service.proxyLanguageService.getCompletionsAtPosition(
      service.file('shapes.mpx'),
      source.indexOf('refs.children') + 'refs.'.length,
      {},
    )
    const names = completions?.entries.map(entry => entry.name) ?? []
    expect(names).toContain('default')
    expect(names).not.toContain('{{ dynamicName }}')
    expect(names).not.toContain('')
  })

  it('unions same-name component refs without turning them into arrays', () => {
    const shared = hover('shapes.mpx', 'shared')
    expect(shared).toContain('loadMore')
    expect(shared).toContain('find')
    expect(shared).not.toContain('[]')
    const mixed = hover('shapes.mpx', 'mixed')
    expect(mixed).toContain('[]')
    expect(mixed).toContain('null')
  })

  it('navigates ref names to every corresponding wx:ref declaration', () => {
    const source = service.read('shapes.mpx')
    const definitions = service.proxyLanguageService.getDefinitionAtPosition(
      service.file('shapes.mpx'),
      source.indexOf('refs.shared') + 6,
    )
    expect(
      definitions?.map(d => d.textSpan.start).sort((a, b) => a - b),
    ).toEqual(
      [...source.matchAll(/wx:ref="shared"/g)].map(
        match => match.index + 'wx:ref="'.length,
      ),
    )
  })

  it('does not create a circular type when refs are exposed back to the template', () => {
    const diagnostics = service.proxyLanguageService.getSemanticDiagnostics(
      service.file('shapes.mpx'),
    )
    expect(
      diagnostics.some(d => [2502, 2456, 7022, 7023].includes(d.code)),
    ).toBe(false)
  })

  it('types lifecycle calls while preserving nested local useContext bindings', () => {
    expect(hover('nested-context.mpx', 'result')).toBe(
      'const result: Promise<number> | undefined',
    )
    const diagnostics = service.proxyLanguageService.getSemanticDiagnostics(
      service.file('nested-context.mpx'),
    )
    expect(diagnostics.map(d => d.code)).toEqual([2345, 2551, 2339])
    expect(hover('nested-context.mpx', 'localResult')).toBe(
      'const localResult: string',
    )
  })

  it('maps each useContext call to one semantic and verification view', () => {
    const { root } = service.getServiceScript('context-js.mpx')
    const source = service.read('context-js.mpx')
    const position = source.indexOf('useContext')
    const script = findScript(root)!
    const mappings = script.mappings.filter(mapping =>
      mapping.sourceOffsets.some(
        (start, index) =>
          start <= position && position < start + mapping.lengths[index],
      ),
    )
    expect(mappings.filter(mapping => mapping.data.semantic)).toHaveLength(1)
    expect(mappings.filter(mapping => mapping.data.verification)).toHaveLength(
      1,
    )
    expect(
      mappings.some(
        mapping =>
          mapping.data.navigation &&
          !mapping.data.semantic &&
          !mapping.data.verification,
      ),
    ).toBe(true)
    expect(
      mappings.some(
        mapping =>
          mapping.data.completion &&
          !mapping.data.semantic &&
          !mapping.data.verification,
      ),
    ).toBe(true)
  })

  function hover(file: string, name: string) {
    const source = service.read(file)
    const position = source.indexOf(`const ${name} =`) + 'const '.length + 1
    return ts.displayPartsToString(
      service.proxyLanguageService.getQuickInfoAtPosition(
        service.file(file),
        position,
      )?.displayParts,
    )
  }

  function sourceText(file: string, start: number, length: number) {
    return service.read(file).slice(start, start + length)
  }

  function findScript(code: VirtualCode): VirtualCode | undefined {
    if (code.id.startsWith('script_')) return code
    for (const child of code.embeddedCodes ?? []) {
      const script = findScript(child)
      if (script) return script
    }
  }
})
