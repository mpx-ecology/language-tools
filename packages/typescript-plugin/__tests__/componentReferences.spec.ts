import path from 'node:path'
import * as ts from 'typescript'
import { afterAll, describe, expect, it } from 'vitest'
import { createTestLanguageService } from '../../language-core/__tests__/utils/createTestLanguageService'
import { proxyLanguageServiceForMpx } from '../src/common'

const root = path.resolve(
  __dirname,
  '../../language-core/__tests__/fixtures/component-references',
)
const fixture = createTestLanguageService(root, [
  path.join(root, 'native.ts.fixture'),
])
const proxy = proxyLanguageServiceForMpx(
  ts,
  fixture.language,
  fixture.proxyLanguageService,
  fixture.getServiceScript('first.mpx').root.mpxCompilerOptions,
  id => id,
)
const target = fixture.file('panel.mpx')
afterAll(() => fixture.dispose())

function entries(references: readonly ts.ReferenceEntry[] | undefined) {
  return (
    references?.map(reference => ({
      file: path.basename(reference.fileName),
      start: reference.textSpan.start,
      text: ts.sys
        .readFile(reference.fileName)!
        .slice(
          reference.textSpan.start,
          reference.textSpan.start + reference.textSpan.length,
        ),
    })) ?? []
  )
}

describe('IDE TypeScript component references', () => {
  it('adds component registrations and template consumers while retaining native TS imports', () => {
    const before = fixture.proxyLanguageService.getFileReferences(target)
    expect(before.map(reference => path.basename(reference.fileName))).toEqual([
      'native.ts.fixture',
    ])
    const result = proxy.getFileReferences(target)
    expect(result).toEqual(expect.arrayContaining(before))
    const mapped = entries(result)
    expect(
      mapped
        .filter(reference => reference.file === 'first.mpx')
        .map(reference => reference.text)
        .sort(),
    ).toEqual(
      [
        './panel.mpx',
        '@/panel.mpx?root=demo',
        'PanelAlias',
        'demo-panel',
        'demo-panel',
      ].sort(),
    )
    expect(mapped.some(reference => reference.file === 'unrelated.mpx')).toBe(
      false,
    )
    expect(
      new Set(mapped.map(reference => `${reference.file}:${reference.start}`))
        .size,
    ).toBe(result.length)
  })

  it.each([
    'demo-panel',
    '/demo-panel',
    'PanelAlias',
    './panel.mpx',
    '@/panel.mpx',
  ])('joins aliases across consumers from %s', text => {
    const file = fixture.file('first.mpx')
    const offset = fixture.read('first.mpx').indexOf(text) + 1
    const references = proxy.getReferencesAtPosition(file, offset)
    expect(
      entries(references).some(
        reference =>
          reference.file === 'second.mpx' && reference.text === 'other-name',
      ),
    ).toBe(true)
    const symbols = proxy.findReferences(file, offset)
    expect(symbols).toHaveLength(1)
    expect(symbols![0]!.references).toEqual(references)
    // includeDeclaration must also identify a real source range, never generated code.
    const definition = symbols![0]!.definition
    expect(
      entries([{ ...definition, isWriteAccess: false }])[0]!.text.length,
    ).toBeGreaterThan(0)
  })

  it('prefers exact spelling and excludes ambiguous spelling fallbacks', () => {
    const mapped = entries(proxy.getFileReferences(target)).filter(
      reference => reference.file === 'collision.mpx',
    )
    expect(mapped.map(reference => reference.text).sort()).toEqual([
      './panel.mpx',
      'DemoPanel',
    ])
    const sameName = entries(proxy.getFileReferences(fixture.file('other.mpx')))
    expect(
      sameName
        .filter(reference => reference.file === 'collision.mpx')
        .map(reference => reference.text)
        .sort(),
    ).toEqual(['./other.mpx', 'demo-panel'])
  })

  it('returns both static candidate identities and keeps exact path ranges for bound strings', () => {
    const mapped = entries(proxy.getFileReferences(target))
    expect(
      mapped
        .filter(reference => reference.file === 'candidates.mpx')
        .map(reference => reference.text)
        .sort(),
    ).toEqual(
      [
        './panel.mpx?root=one',
        './panel.mpx?root=two',
        'candidate-panel',
        'candidate-panel',
      ].sort(),
    )
    expect(
      mapped
        .filter(reference => reference.file === 'bound.mpx')
        .map(reference => reference.text)
        .sort(),
    ).toEqual(['./panel.mpx', 'bound-panel'])
    expect(
      entries(proxy.getFileReferences(fixture.file('panel.ali.mpx')))
        .map(reference => reference.text)
        .sort(),
    ).toEqual(['./panel.ali.mpx', 'candidate-panel', 'candidate-panel'].sort())
  })

  it('leaves ordinary script-symbol references with the TypeScript service', () => {
    const file = fixture.file('panel.mpx')
    const offset = fixture.read('panel.mpx').indexOf('title:')
    expect(proxy.findReferences(file, offset)).toEqual(
      fixture.proxyLanguageService.findReferences(file, offset),
    )
  })
})
