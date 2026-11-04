import path from 'node:path'
import * as ts from 'typescript'
import type { LanguageServiceContext } from '@volar/language-service'
import type { IRequests } from '../../typescript-plugin/src/requests'
import type { RequestContext } from '../../typescript-plugin/src/requests/types'
import { getComponentNames } from '../../typescript-plugin/src/requests/getComponentNames'
import { getComponentProps } from '../../typescript-plugin/src/requests/getComponentProps'
import { TextDocument } from 'vscode-languageserver-textdocument'
import { URI } from 'vscode-uri'
import { afterAll, describe, expect, it } from 'vitest'
import { createTestLanguageService } from '../../language-core/__tests__/utils/createTestLanguageService'
import { create } from '../src/plugins/mpx-sfc-template'

const service = createTestLanguageService(
  path.resolve(
    __dirname,
    '../../language-core/__tests__/fixtures/rn-components',
  ),
)
const requestContext: RequestContext = {
  typescript: ts,
  language: service.language,
  languageService: service.languageService,
  languageServiceHost: service.languageServiceHost,
  isTsPlugin: false,
  getFileId: name => name,
}
const fileName = service.file('setup.ios.mpx')
const sourceUri = URI.file(fileName)
const sourceScript = service.language.scripts.get(fileName)!
const context = {
  env: { workspaceFolders: [], getConfiguration: async () => undefined },
  project: { mpx: {} },
  language: { scripts: { get: () => sourceScript } },
  decodeEmbeddedDocumentUri: () => [sourceUri, 'template'],
} as unknown as LanguageServiceContext
const client = {
  getComponentNames: async (file: string) =>
    getComponentNames.call(requestContext, file),
  getComponentProps: async (file: string, tag: string) =>
    getComponentProps.call(requestContext, file, tag),
} as unknown as IRequests
const plugin = create(() => client).create!(context)!
const token = {
  isCancellationRequested: false,
  onCancellationRequested: () => ({ dispose() {} }),
}
afterAll(() => {
  plugin.dispose?.()
  service.dispose()
})

async function complete(marked: string) {
  const position = marked.indexOf('|')
  const document = TextDocument.create(
    `${sourceUri}.__template.html`,
    'html',
    0,
    marked.replace('|', ''),
  )
  return (
    (
      await plugin.provideCompletionItems!(
        document,
        document.positionAt(position),
        { triggerKind: 1 },
        token,
      )
    )?.items ?? []
  )
}

describe('RN registration completion through HTML and TypeScript services', () => {
  it('suggests registration aliases without suggesting instance methods', async () => {
    const items = await complete('<|')
    expect(items.map(item => item.label)).toEqual(
      expect.arrayContaining([
        'NativeView',
        'FunctionAlias',
        'ClassAlias',
        'ForwardAlias',
      ]),
    )
    expect(items.map(item => item.label)).not.toContain('handleFooterLayout')
  })
  it.each(['NativeView', 'FunctionAlias', 'ClassAlias', 'ForwardAlias'])(
    'completes typed callback props on %s',
    async tag => {
      const items = await complete(`<${tag} | />`)
      const onLayout = items.find(item => item.label === 'onLayout')
      expect(onLayout).toBeDefined()
      expect(JSON.stringify(onLayout?.documentation)).toContain(
        'LayoutChangeEvent',
      )
      expect(items.map(item => item.label)).not.toContain('bindlayout')
    },
  )
})
