import path from 'node:path'
import type { LanguageServiceContext } from '@volar/language-service'
import type { LocationLink } from 'vscode-languageserver-protocol'
import { TextDocument } from 'vscode-languageserver-textdocument'
import { URI } from 'vscode-uri'
import { afterEach, describe, expect, it } from 'vitest'
import {
  type TestLanguageService,
  createTestLanguageService,
} from '../../language-core/__tests__/utils/createTestLanguageService'
import { create as createTemplateLinks } from '../src/plugins/mpx-sfc-template-links'
import { create as createComponentDefinition } from '../src/plugins/mpx-component-definition'
import { create as createJsonLinks } from '../src/plugins/mpx-sfc-json-links'

const fixtureRoot = path.resolve(
  __dirname,
  '../../language-core/__tests__/fixtures/platform-components',
)
const token = {
  isCancellationRequested: false,
  onCancellationRequested: () => ({ dispose() {} }),
}
const services: TestLanguageService[] = []
afterEach(() => {
  for (const service of services.splice(0)) service.dispose()
})
function setup() {
  const service = createTestLanguageService(fixtureRoot)
  services.push(service)
  const fileName = service.file('index.mpx')
  const { root } = service.getServiceScript('index.mpx')
  const source = service.language.scripts.get(fileName)!
  const sourceUri = URI.file(fileName)
  const template = TextDocument.create(
    `${sourceUri}.__template.html`,
    'html',
    0,
    root.sfc.template!.content,
  )
  const json = TextDocument.create(
    `${sourceUri}.__json.js`,
    'javascript',
    0,
    root.sfc.json!.content.replace(/^\n/, ''),
  )
  const context = {
    decodeEmbeddedDocumentUri: (uri: URI) => [
      sourceUri,
      uri.toString() === template.uri ? 'template' : 'json_js',
    ],
    language: { scripts: { get: () => source } },
  } as unknown as LanguageServiceContext
  return { service, context, template, json }
}
const targetNames = (definitions: unknown) =>
  ((definitions as LocationLink[]) ?? [])
    .map(definition => path.basename(URI.parse(definition.targetUri).fsPath))
    .sort()

describe('platform component forward navigation', () => {
  it.each([
    ['template links', createTemplateLinks],
    ['component definitions', createComponentDefinition],
  ] as const)(
    '%s retains all real files and deduplicates aliases, query and closing-tag hits',
    async (_, create) => {
      const { context, template } = setup()
      const plugin = create().create!(context)!
      for (const offset of [
        template.getText().indexOf('demo-panel') + 1,
        template.getText().indexOf('</demo-panel') + 3,
      ]) {
        const definitions = await plugin.provideDefinition!(
          template,
          template.positionAt(offset),
          token,
        )
        expect(targetNames(definitions)).toEqual([
          'panel.ali.mpx',
          'panel.ios.mpx',
          'panel.mpx',
        ])
      }
    },
  )
  it('keeps all JSON path definitions and links with their original source ranges', async () => {
    const { context, json } = setup()
    const plugin = createComponentDefinition({ template: false }).create!(
      context,
    )!
    const offset = json.getText().indexOf('./panel')
    const definitions = await plugin.provideDefinition!(
      json,
      json.positionAt(offset + 2),
      token,
    )
    expect(targetNames(definitions)).toEqual([
      'panel.ali.mpx',
      'panel.ios.mpx',
      'panel.mpx',
    ])
    expect(
      (definitions as LocationLink[]).every(
        definition =>
          json.getText(definition.originSelectionRange) === './panel',
      ),
    ).toBe(true)
    const jsonPlugin = createJsonLinks().create!(context)!
    expect(await jsonPlugin.provideDiagnostics!(json, token)).toEqual([])
    const links = await jsonPlugin.provideDocumentLinks!(json, token)
    expect(
      links?.filter(link => json.getText(link.range) === './panel'),
    ).toHaveLength(3)
    expect(
      links?.filter(
        link => json.getText(link.range) === '@components/panel.mpx?root=demo',
      ),
    ).toHaveLength(3)
  })
  it('does not merge distinct files that originated from the same path text', async () => {
    const { context, template } = setup()
    const plugin = createTemplateLinks().create!(context)!
    const links = await plugin.provideDocumentLinks!(template, token)
    const start = template.getText().indexOf('demo-panel')
    const tagLinks =
      links?.filter(link => template.offsetAt(link.range.start) === start) ?? []
    expect(tagLinks).toHaveLength(3)
    expect(new Set(tagLinks.map(link => link.target)).size).toBe(3)
    expect(tagLinks.every(link => link.tooltip?.includes('→'))).toBe(true)
  })
  it('keeps explicit source-file navigation independent from resource query', async () => {
    const { context, template, json } = setup()
    const jsonProvider = createComponentDefinition().create!(context)!
    const templateProvider = createTemplateLinks().create!(context)!
    expect(
      targetNames(
        await jsonProvider.provideDefinition!(
          json,
          json.positionAt(
            json.getText().indexOf('./panel.ios.mpx?mode=ali') + 2,
          ),
          token,
        ),
      ),
    ).toEqual(['panel.ios.mpx'])
    expect(
      targetNames(
        await templateProvider.provideDefinition!(
          template,
          template.positionAt(template.getText().indexOf('explicit-panel') + 1),
          token,
        ),
      ),
    ).toEqual(['panel.ios.mpx'])
  })
})
