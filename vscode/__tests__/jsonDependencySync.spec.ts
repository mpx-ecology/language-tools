import type { BaseLanguageClient, StaticFeature } from '@volar/vscode'
import { describe, expect, it, vi } from 'vitest'
import { registerJsonDependencySync } from '../src/features/jsonDependencySync'

describe('JSON dependency document synchronization', () => {
  it('adds only native JS/TS synchronization and repeats it after client restart', () => {
    const sync = new Map(
      [
        'textDocument/didOpen',
        'textDocument/didChange',
        'textDocument/didClose',
      ].map(method => [method, { initialize: vi.fn() }]),
    )
    let feature: StaticFeature
    const client = {
      registerFeature: (value: StaticFeature) => {
        feature = value
      },
      getFeature: vi.fn((method: string) => {
        const result = sync.get(method)
        if (!result)
          throw new Error(`Unexpected provider registration: ${method}`)
        return result
      }),
    }
    registerJsonDependencySync(client as unknown as BaseLanguageClient)

    const capabilities = {
      textDocumentSync: { openClose: true, change: 2 as const },
    }
    const selectors = [
      { language: 'javascript' },
      { language: 'javascriptreact' },
      { language: 'typescript' },
      { language: 'typescriptreact' },
    ]
    // The languageclient initializes static features on each connection and
    // clears its built-in registrations before initializing a replacement.
    for (let start = 1; start <= 2; start++) {
      feature!.initialize(capabilities, [{ language: 'mpx' }])
      for (const provider of sync.values()) {
        expect(provider.initialize).toHaveBeenCalledTimes(start)
        expect(provider.initialize).toHaveBeenLastCalledWith(
          capabilities,
          selectors,
        )
      }
      feature!.clear()
    }
    expect(feature!.getState()).toEqual({ kind: 'static' })
    expect(
      client.getFeature.mock.calls.map(([method]) => method),
    ).not.toContain('textDocument/hover')
  })
})
