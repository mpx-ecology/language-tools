import path from 'node:path'
import * as ts from 'typescript'
import type { LanguageServiceContext } from '@volar/language-service'
import type { IRequests } from '../../typescript-plugin/src/requests'
import type { RequestContext } from '../../typescript-plugin/src/requests/types'
import { getComponentProps } from '../../typescript-plugin/src/requests/getComponentProps'
import { getComponentNames } from '../../typescript-plugin/src/requests/getComponentNames'
import { TextDocument } from 'vscode-languageserver-textdocument'
import { URI } from 'vscode-uri'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import {
  type TestLanguageService,
  createTestLanguageService,
} from '../../language-core/__tests__/utils/createTestLanguageService'
import { create as createTemplate } from '../src/plugins/mpx-sfc-template'
import { create as createTemplateLinks } from '../src/plugins/mpx-sfc-template-links'
import { create as createComponentDefinition } from '../src/plugins/mpx-component-definition'

const token = {
  isCancellationRequested: false,
  onCancellationRequested: () => ({ dispose() {} }),
}
let service: TestLanguageService
let request: RequestContext
beforeAll(() => {
  service = createTestLanguageService(
    path.resolve(
      __dirname,
      '../../language-core/__tests__/fixtures/mpx-tag-name',
    ),
  )
  request = {
    typescript: ts,
    language: service.language,
    languageService: service.languageService,
    languageServiceHost: service.languageServiceHost,
    isTsPlugin: false,
    getFileId: file => file,
  }
})
afterAll(() => service.dispose())

function setup(file: string, content?: string) {
  const fileName = service.file(file)
  const { root } = service.getServiceScript(file)
  const sourceScript = service.language.scripts.get(fileName)!
  const uri = URI.file(fileName)
  const document = TextDocument.create(
    `${uri}.__template.html`,
    'html',
    0,
    content ?? root.sfc.template!.content,
  )
  const context = {
    env: { workspaceFolders: [], getConfiguration: async () => undefined },
    project: { mpx: {} },
    decodeEmbeddedDocumentUri: () => [uri, 'template'],
    language: { scripts: { get: () => sourceScript } },
  } as unknown as LanguageServiceContext
  const client = {
    getComponentProps: async (file: string, tag: string) =>
      getComponentProps.call(request, file, tag),
    getComponentNames: async (file: string) =>
      getComponentNames.call(request, file),
  } as IRequests
  return { document, context, client }
}

describe('mpxTagName editor providers', () => {
  it.each([createTemplateLinks, createComponentDefinition])(
    'navigates from attribute values with precise origin ranges',
    async create => {
      const { document, context } = setup('valid.mpx')
      const provider = create().create!(context)!
      for (const needle of [
        "mpxTagName='tag-panel'",
        'mpxTagName@ios|android="tag-panel"',
      ]) {
        const start =
          document.getText().indexOf(needle) + needle.indexOf('tag-panel')
        const result = await provider.provideDefinition!(
          document,
          document.positionAt(start + 2),
          token,
        )
        expect(result).toEqual([
          expect.objectContaining({
            targetUri: URI.file(service.file('panel.mpx')).toString(),
            originSelectionRange: {
              start: document.positionAt(start),
              end: document.positionAt(start + 'tag-panel'.length),
            },
          }),
        ])
      }
      expect(
        await provider.provideDefinition!(
          document,
          document.positionAt(document.getText().indexOf('view') + 1),
          token,
        ),
      ).toBeUndefined()
    },
  )

  it('provides links only on effective values, without inventing an end-tag value', async () => {
    const { document, context } = setup('valid.mpx')
    const links = await createTemplateLinks().create!(context)!
      .provideDocumentLinks!(document, token)
    expect(links?.map(link => document.getText(link.range))).toEqual([
      'tag-panel',
      'tag-panel',
    ])
  })

  it.each([
    ['index.mpx', 'maxlength', 'maxlength', 'hover-class'],
    ['index.mpx', ' title=', 'title', 'maxlength'],
    ['platforms.mpx', 'maxlength@swan', 'maxlength', undefined],
  ])(
    'completes effective props at %s %s',
    async (file, needle, expected, excluded) => {
      const { document, context, client } = setup(file)
      const provider = createTemplate(() => client).create!(context)!
      try {
        const offset =
          document.getText().indexOf(needle) + (needle.startsWith(' ') ? 2 : 1)
        const result = await provider.provideCompletionItems!(
          document,
          document.positionAt(offset),
          { triggerKind: 1 },
          token,
        )
        expect(result?.items.map(item => item.label)).toContain(expected)
        if (excluded)
          expect(result?.items.map(item => item.label)).not.toContain(excluded)
      } finally {
        provider.dispose?.()
      }
    },
  )

  it('keeps native event candidates and documentation on overridden nodes', async () => {
    const { document, context, client } = setup('index.mpx')
    const provider = createTemplate(() => client).create!(context)!
    try {
      const offset = document.getText().indexOf('bindinput') + 4
      const result = await provider.provideCompletionItems!(
        document,
        document.positionAt(offset),
        { triggerKind: 1 },
        token,
      )
      expect(result?.items.map(item => item.label)).toContain('bind:input')
      const hover = await provider.provideHover!(
        document,
        document.positionAt(document.getText().indexOf('maxlength') + 1),
        token,
      )
      expect(hover?.contents).toBeTruthy()
    } finally {
      provider.dispose?.()
    }
  })

  it.each([
    'mpxTagName="in|put"',
    "mpxTagName='|input'",
    'mpxTagName@swan="|"',
    'mpxTagName=input|',
  ])(
    'completes tag values without replacing quotes or wrapper tags: %s',
    async marked => {
      const text = `<view ${marked}></view>`
      const offset = text.indexOf('|')
      const { document, context, client } = setup(
        'index.mpx',
        text.replace('|', ''),
      )
      const provider = createTemplate(() => client).create!(context)!
      try {
        const result = await provider.provideCompletionItems!(
          document,
          document.positionAt(offset),
          { triggerKind: 1 },
          token,
        )
        expect(result?.items.map(item => item.label)).toEqual(
          expect.arrayContaining(['input', 'tag-panel']),
        )
        const item = result!.items.find(item => item.label === 'tag-panel')!
        const edited = TextDocument.applyEdits(document, [
          item.textEdit as import('vscode-languageserver-protocol').TextEdit,
        ])
        expect(edited).toBe(
          text.replace('|', '').replace(/input|(?<=\")(?=\")/, 'tag-panel'),
        )
      } finally {
        provider.dispose?.()
      }
    },
  )

  it('completes an unfinished opening quote without replacing the quote', async () => {
    const { document, context, client } = setup(
      'index.mpx',
      '<view mpxTagName="',
    )
    const provider = createTemplate(() => client).create!(context)!
    try {
      const result = await provider.provideCompletionItems!(
        document,
        document.positionAt(document.getText().length),
        { triggerKind: 1 },
        token,
      )
      const item = result?.items.find(item => item.label === 'tag-panel')
      expect(item).toBeDefined()
      expect(
        TextDocument.applyEdits(document, [
          item!.textEdit as import('vscode-languageserver-protocol').TextEdit,
        ]),
      ).toBe('<view mpxTagName="tag-panel')
    } finally {
      provider.dispose?.()
    }
  })

  it('does not inject tag completions into an indeterminate value', async () => {
    const { document, context, client } = setup(
      'index.mpx',
      '<view mpxTagName="{{ tagName }}" />',
    )
    const provider = createTemplate(() => client).create!(context)!
    try {
      const result = await provider.provideCompletionItems!(
        document,
        document.positionAt(document.getText().indexOf('tagName') + 2),
        { triggerKind: 1 },
        token,
      )
      expect(result?.items.map(item => item.label) ?? []).not.toContain(
        'tag-panel',
      )
    } finally {
      provider.dispose?.()
    }
  })

  it('shows the prop types from each possible tag in a shared attribute hover', async () => {
    const { document, context, client } = setup('shared-custom.mpx')
    const provider = createTemplate(() => client).create!(context)!
    try {
      const result = await provider.provideHover!(
        document,
        document.positionAt(document.getText().indexOf(' title=') + 2),
        token,
      )
      const contents = JSON.stringify(result?.contents)
      expect(contents).toContain('tag-panel')
      expect(contents).toContain('count-panel')
      expect(contents).toContain('string')
      expect(contents).toContain('number')
    } finally {
      provider.dispose?.()
    }
  })

  it('retains linked editing and auto-closing of the original wrapper', async () => {
    const { document, context, client } = setup('valid.mpx')
    const provider = createTemplate(() => client).create!(context)!
    try {
      const linked = await provider.provideLinkedEditingRanges!(
        document,
        document.positionAt(document.getText().indexOf('view') + 1),
        token,
      )
      expect(linked?.ranges.map(range => document.getText(range))).toEqual([
        'view',
        'view',
      ])
      const content = '<view mpxTagName="input">'
      const insertion = TextDocument.create(document.uri, 'html', 1, content)
      expect(
        await provider.provideAutoInsertSnippet!(
          insertion,
          insertion.positionAt(content.length),
          {
            rangeOffset: content.length - 1,
            rangeLength: 0,
            text: '>',
          },
          token,
        ),
      ).toBe('$0</view>')
    } finally {
      provider.dispose?.()
    }
  })
})
