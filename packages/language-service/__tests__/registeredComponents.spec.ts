import path from 'node:path'
import * as ts from 'typescript'
import type { LanguageServiceContext } from '@volar/language-service'
import type { IRequests } from '../../typescript-plugin/src/requests'
import type { RequestContext } from '../../typescript-plugin/src/requests/types'
import { getComponentNames } from '../../typescript-plugin/src/requests/getComponentNames'
import { getComponentProps } from '../../typescript-plugin/src/requests/getComponentProps'
import { createTestLanguageService } from '../../language-core/__tests__/utils/createTestLanguageService'
import { create } from '../src/plugins/mpx-sfc-template'
import { create as createDefinition } from '../src/plugins/mpx-component-definition'
import { TextDocument } from 'vscode-languageserver-textdocument'
import { URI } from 'vscode-uri'
import { afterAll, expect, it } from 'vitest'

const root = path.resolve(
  __dirname,
  '../../language-core/__tests__/fixtures/registered-components',
)
const service = createTestLanguageService(root, [
  path.join(root, 'globals.d.ts'),
])
const requests: RequestContext = {
  typescript: ts,
  language: service.language,
  languageService: service.languageService,
  languageServiceHost: service.languageServiceHost,
  isTsPlugin: false,
  getFileId: id => id,
}
const context = {
  env: { workspaceFolders: [], getConfiguration: async () => undefined },
  project: { mpx: {} },
  decodeEmbeddedDocumentUri(uri: URI) {
    return [
      URI.parse(uri.toString().replace('.__template.html', '')),
      'template',
    ]
  },
  language: {
    scripts: { get: (uri: URI) => service.language.scripts.get(uri.fsPath) },
  },
} as unknown as LanguageServiceContext
const instance = create(
  () =>
    ({
      getComponentNames: async file => getComponentNames.call(requests, file),
      getComponentProps: async (file, tag) =>
        getComponentProps.call(requests, file, tag),
    }) as IRequests,
).create!(context)!
const token = {
  isCancellationRequested: false,
  onCancellationRequested: () => ({ dispose() {} }),
}
afterAll(() => {
  instance.dispose?.()
  service.dispose()
})

async function complete(source: string, file = 'app-a/pages/index.mpx') {
  service.getServiceScript(file)
  const offset = source.indexOf('|')
  const document = TextDocument.create(
    `${URI.file(service.file(file))}.__template.html`,
    'html',
    0,
    source.replace('|', ''),
  )
  const result = await instance.provideCompletionItems!(
    document,
    document.positionAt(offset),
    { triggerKind: 1 },
    token,
  )
  return { document, items: result?.items ?? [] }
}

it.each(['<|', '<app-|', '|'])(
  'offers only registered sources at %s',
  async source => {
    const { items } = await complete(source)
    const names = items.map(item => item.label)
    expect(names).toEqual(
      expect.arrayContaining([
        'app-panel',
        'local-panel',
        'TypedPanel',
        'typed-panel',
        'typed-dash',
      ]),
    )
    for (const name of [
      'AppPanel',
      'other-panel',
      'Unused',
      'privateField',
      'Index',
    ])
      expect(names).not.toContain(name)
    expect(names.filter(name => name === 'app-panel')).toHaveLength(1)
    expect(items.every(item => !item.additionalTextEdits?.length)).toBe(true)
  },
)
it.each([
  '<app-panel | />',
  '<TypedPanel | />',
  '<typed-panel | />',
  '<typed-dash | />',
])('completes precise props at %s', async source => {
  const { items } = await complete(source)
  expect(items.map(item => item.label)).toContain('title')
  expect(items.map(item => item.label)).not.toContain('mustNotLeak')
})
it('separates applications and retains the literal local override spelling', async () => {
  const other = await complete('<|', 'app-b/pages/index.mpx')
  expect(other.items.map(item => item.label)).toContain('other-panel')
  expect(
    JSON.stringify(
      other.items.find(item => item.label === 'app-panel')?.documentation,
    ),
  ).toContain('类型声明组件')
  const local = await complete('<|', 'app-a/pages/override.mpx')
  expect(local.items.map(item => item.label)).toContain('AppPanel')
  expect(local.items.map(item => item.label)).not.toContain('app-panel')
})
it('navigates inherited application tags to their component file', async () => {
  const { document } = await complete('<app-p|anel title="ok" />')
  const result = await createDefinition().create!(context)!.provideDefinition!(
    document,
    document.positionAt(4),
    token,
  )
  expect(result).toEqual([
    expect.objectContaining({
      targetUri: URI.file(service.file('app-a/panel.mpx')).toString(),
    }),
  ])
})
