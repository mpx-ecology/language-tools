import type { LanguageServiceContext } from '@volar/language-service'
import { TextDocument } from 'vscode-languageserver-textdocument'
import { URI } from 'vscode-uri'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import {
  type TestLanguageService,
  createTestLanguageService,
} from '../../language-core/__tests__/utils/createTestLanguageService'
import { create as createTemplateLinks } from '../src/plugins/mpx-sfc-template-links'
import { create as createComponentDefinition } from '../src/plugins/mpx-component-definition'

const token = {
  isCancellationRequested: false,
  onCancellationRequested: () => ({ dispose() {} }),
}

describe('assigned component object navigation', () => {
  let service: TestLanguageService
  let context: LanguageServiceContext
  let templateDocument: TextDocument
  let jsonDocument: TextDocument
  let targetUri: string

  beforeAll(() => {
    service = createTestLanguageService()
    const fileName = service.file('assigned-component-object.mpx')
    const { root } = service.getServiceScript('assigned-component-object.mpx')
    const sourceScript = service.language.scripts.get(fileName)!
    const sourceUri = URI.file(fileName)
    targetUri = URI.file(service.file('component-options.mpx')).toString()
    templateDocument = TextDocument.create(
      `${sourceUri}.__template.html`,
      'html',
      0,
      root.sfc.template!.content,
    )
    jsonDocument = TextDocument.create(
      `${sourceUri}.__json.js`,
      'javascript',
      0,
      root.sfc.json!.content,
    )
    context = {
      decodeEmbeddedDocumentUri(uri: URI) {
        return [
          sourceUri,
          uri.toString() === templateDocument.uri ? 'template' : 'json_js',
        ]
      },
      language: { scripts: { get: () => sourceScript } },
    } as unknown as LanguageServiceContext
  })

  afterAll(() => service.dispose())

  it('provides a document link for the range entry registered by assignment', async () => {
    const plugin = createTemplateLinks().create!(context)!
    const links = await plugin.provideDocumentLinks!(templateDocument, token)
    const rangeLink = links?.find(
      link => templateDocument.getText(link.range) === 'carpool-hold-panel',
    )
    expect(rangeLink?.target).toBe(targetUri)
    expect(templateDocument.offsetAt(rangeLink!.range.start)).toBe(
      templateDocument.getText().indexOf('carpool-hold-panel'),
    )
  })

  it.each([
    ['template links', createTemplateLinks],
    ['component definition', createComponentDefinition],
  ] as const)('supports F12 in range via %s', async (_, create) => {
    const plugin = create().create!(context)!
    const offset = templateDocument.getText().indexOf('carpool-hold-panel')
    const definitions = await plugin.provideDefinition!(
      templateDocument,
      templateDocument.positionAt(offset + 5),
      token,
    )
    expect(definitions).toEqual([
      expect.objectContaining({
        targetUri,
        originSelectionRange: {
          start: templateDocument.positionAt(offset),
          end: templateDocument.positionAt(
            offset + 'carpool-hold-panel'.length,
          ),
        },
      }),
    ])
  })

  it('keeps navigation on the original assigned JSON path', async () => {
    const plugin = createComponentDefinition().create!(context)!
    const offset = jsonDocument
      .getText()
      .indexOf('./component-options.mpx?root=demo')
    const definitions = await plugin.provideDefinition!(
      jsonDocument,
      jsonDocument.positionAt(offset + 5),
      token,
    )
    expect(definitions).toEqual([expect.objectContaining({ targetUri })])
  })
})
