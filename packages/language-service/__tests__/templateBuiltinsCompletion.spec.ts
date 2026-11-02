import { afterAll, describe, expect, it } from 'vitest'
import type { LanguageServiceContext } from '@volar/language-service'
import type { TextEdit } from 'vscode-languageserver-protocol'
import { TextDocument } from 'vscode-languageserver-textdocument'
import { create } from '../src/plugins/mpx-sfc-template'

const context = {
  env: { workspaceFolders: [], getConfiguration: async () => undefined },
  project: { mpx: {} },
  decodeEmbeddedDocumentUri: () => undefined,
} as unknown as LanguageServiceContext
const token = {
  isCancellationRequested: false,
  onCancellationRequested: () => ({ dispose() {} }),
}
const instance = create(() => undefined).create!(context)!
afterAll(() => instance.dispose?.())

async function complete(markedText: string) {
  const offset = markedText.indexOf('|')
  const document = TextDocument.create(
    'file:///template.html',
    'html',
    0,
    markedText.replace('|', ''),
  )
  const result = await instance.provideCompletionItems!(
    document,
    document.positionAt(offset),
    { triggerKind: 1 },
    token,
  )
  return { document, items: result?.items ?? [] }
}

describe('built-in template attribute and event completion', () => {
  it('keeps tag completion at template starts without injecting tags into expressions', async () => {
    for (const source of ['|', '<vi|']) {
      const { items } = await complete(source)
      expect(items.map(item => item.label)).toContain('view')
    }
    for (const source of [
      '<text>{{ profile.|name }}</text>',
      '<view title="{{ prop|Title }}" />',
    ]) {
      const { items } = await complete(source)
      expect(items.map(item => item.label)).not.toContain('view')
    }
  })

  it.each([
    ['view', 'hover-class'],
    ['view', 'enable-text-pass-through'],
    ['view', 'wx:model'],
    ['text', 'decode'],
    ['image', 'is-svg'],
    ['cover-image', 'is-svg'],
    ['input', 'keyboard-type'],
    ['textarea', 'keyboard-type'],
    ['movable-view', 'workletChange'],
    ['scroll-view', 'scroll-y'],
  ])('completes %s attribute %s', async (tag, attribute) => {
    const { items } = await complete(`<${tag} | />`)
    expect(items.map(item => item.label)).toContain(attribute)
    expect(
      items.find(item => item.label === attribute)?.documentation,
    ).toBeTruthy()
  })

  it.each([
    ['bind:', 'bind:tap'],
    ['catch', 'catchtap'],
    ['catch:', 'catch:tap'],
    ['capture-bind', 'capture-bindtap'],
    ['capture-bind:', 'capture-bind:tap'],
    ['capture-catch', 'capture-catchtap'],
    ['capture-catch:', 'capture-catch:tap'],
  ])(
    'replaces %s with %s and preserves the handler',
    async (prefix, binding) => {
      const { document, items } = await complete(
        `<view ${prefix}|="handleTap" />`,
      )
      const item = items.find(item => item.label === binding)
      expect(item).toBeDefined()
      expect(
        TextDocument.applyEdits(document, [item!.textEdit as TextEdit]),
      ).toBe(`<view ${binding}="handleTap" />`)
    },
  )

  it('provides bind aliases without suggesting capture for non-bubbling events', async () => {
    const { items } = await complete('<input bind:| />')
    const names = items.map(item => item.label)
    expect(names).toEqual(
      expect.arrayContaining([
        'bindinput',
        'bind:input',
        'bindselectionchange',
        'bind:selectionchange',
      ]),
    )
    for (const name of [
      'catchinput',
      'catch:input',
      'capture-bind:input',
      'bind:unknown',
    ])
      expect(names).not.toContain(name)
    expect(names.filter(name => name === 'bind:selectionchange')).toHaveLength(
      1,
    )
  })

  it('keeps component-specific properties on their owning tags', async () => {
    const { items } = await complete('<view | />')
    const names = items.map(item => item.label)
    expect(names).not.toContain('is-svg')
    expect(names).not.toContain('keyboard-type')
    expect(names).not.toContain('workletChange')
  })

  it.each(['@ios|android', '@_ios|_android', '@ios:didi', '@(ios|android)'])(
    'preserves platform suffix %s when completing an attribute name',
    async condition => {
      const { document, items } = await complete(
        `<image is-s|${condition}="{{ true }}" />`,
      )
      const item = items.find(item => item.label === 'is-svg')
      expect(item).toBeDefined()
      expect(
        TextDocument.applyEdits(document, [item!.textEdit as TextEdit]),
      ).toBe(`<image is-svg${condition}="{{ true }}" />`)
    },
  )

  it('keeps property value completion and hover documentation', async () => {
    const { items } = await complete('<image mode="|" />')
    expect(items.map(item => item.label)).toContain('aspectFit')
    const document = TextDocument.create(
      'file:///hover.html',
      'html',
      0,
      '<image is-svg="{{ true }}" />',
    )
    const hover = await instance.provideHover!(
      document,
      document.positionAt(9),
      token,
    )
    expect(JSON.stringify(hover)).toContain('SVG')
  })
})
