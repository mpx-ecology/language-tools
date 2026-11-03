import type { BaseLanguageClient } from '@volar/vscode'

/** Keep native dependency buffers current without registering Mpx providers for them. */
export function registerJsonDependencySync(client: BaseLanguageClient) {
  client.registerFeature({
    fillClientCapabilities() {},
    initialize(capabilities) {
      const selector = [
        { language: 'javascript' },
        { language: 'javascriptreact' },
        { language: 'typescript' },
        { language: 'typescriptreact' },
      ]
      // Reuse languageclient's negotiated sync kind, existing-buffer replay,
      // deduplication and restart cleanup. Other providers retain their selector.
      client
        .getFeature('textDocument/didChange')
        .initialize(capabilities, selector)
      client
        .getFeature('textDocument/didClose')
        .initialize(capabilities, selector)
      client
        .getFeature('textDocument/didOpen')
        .initialize(capabilities, selector)
    },
    clear() {},
    getState: () => ({ kind: 'static' }),
  })
}
