import type { LanguageServiceContext } from '@volar/language-service'
import type { IRequests } from '../../typescript-plugin/src/requests'
import * as ts from 'typescript'
import { TextDocument } from 'vscode-languageserver-textdocument'
import { URI } from 'vscode-uri'
import { expect, it, vi } from 'vitest'
import {
  createMpxLanguagePlugin,
  forEachEmbeddedCode,
  getDefaultCompilerOptions,
} from '@mpxjs/language-core'
import { create } from '../src/plugins/mpx-sfc-json-import-completion'

const token = {
  isCancellationRequested: false,
  onCancellationRequested: () => ({ dispose() {} }),
}

function contextFor(source: string) {
  const uri = URI.file('/json-completion/index.mpx')
  const plugin = createMpxLanguagePlugin(
    ts,
    {},
    getDefaultCompilerOptions(),
    (id: string) => id,
  )
  const root = plugin.createVirtualCode!(
    uri.fsPath,
    'mpx',
    ts.ScriptSnapshot.fromString(source),
    { getAssociatedScript: () => undefined },
  )!
  const codes = new Map(
    [...forEachEmbeddedCode(root)].map(code => [code.id, code]),
  )
  const code = codes.get('json_js')!
  const document = TextDocument.create(
    uri.toString() + '.json.js',
    'javascript',
    0,
    code.snapshot.getText(0, code.snapshot.getLength()),
  )
  const context = {
    decodeEmbeddedDocumentUri: () => [uri, 'json_js'],
    language: {
      scripts: { get: () => ({ generated: { root, embeddedCodes: codes } }) },
    },
  } as unknown as LanguageServiceContext
  return { uri, document, context }
}

it.each(['', '\n', '\r\n'])(
  'preserves JSON path completion source positions with prefix %j',
  async prefix => {
    // An intentionally partial component path models the completion cursor.
    const source =
      '<script name="json">' +
      prefix +
      "module.exports = { usingComponents: { panel: './' } }</script>"
    const { uri, document, context } = contextFor(source)
    const entries = ['panel.mpx', 'panel.mpx', 'components'].map(name => ({
      name,
      kind:
        name === 'components'
          ? ts.ScriptElementKind.directory
          : ts.ScriptElementKind.scriptElement,
      kindModifiers: '',
      sortText: '0',
    }))
    const getCompletion = vi.fn(async () => entries)
    const service = create(
      () => ({ getCompletion }) as unknown as IRequests,
    ).create(context)
    const position = document.positionAt(document.getText().indexOf("'./'") + 3)
    const result = await service.provideCompletionItems!(
      document,
      position,
      { triggerKind: 1 },
      token,
    )
    expect(getCompletion).toHaveBeenCalledWith(
      uri.fsPath,
      source.indexOf("'./'") + 3,
    )
    expect(Array.isArray(result?.items)).toBe(true)
    expect(result?.items.map(item => item.label)).toEqual([
      'panel.mpx',
      'components',
    ])
  },
)

it('lets the JS semantic provider answer when the tsserver path mapping has no result', async () => {
  const { document, context } = contextFor(
    '<script name="json">const config = {}; module.exports = config</script>',
  )
  const service = create(() => undefined).create(context)
  expect(
    await service.provideCompletionItems!(
      document,
      { line: 0, character: 5 },
      { triggerKind: 1 },
      token,
    ),
  ).toBeUndefined()
})
