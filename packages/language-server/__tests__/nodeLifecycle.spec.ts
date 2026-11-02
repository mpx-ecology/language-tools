import { beforeAll, describe, expect, it, vi } from 'vitest'

const lifecycle = vi.hoisted(() => ({
  initialize: undefined as undefined | ((params: any) => unknown),
  initialized: undefined as undefined | (() => void),
  changed: undefined as undefined | ((event: any) => void),
  refresh: vi.fn(),
  watchFiles: vi.fn(),
  setup: vi.fn(),
}))

vi.mock('@volar/language-server/node', () => ({
  createConnection: () => ({
    listen() {},
    onNotification() {},
    onInitialize: (callback: typeof lifecycle.initialize) => {
      lifecycle.initialize = callback
    },
    onInitialized: (callback: typeof lifecycle.initialized) => {
      lifecycle.initialized = callback
    },
    onShutdown() {},
  }),
  createServer: () => ({
    documents: { onDidClose() {} },
    initialized: lifecycle.setup,
    shutdown() {},
    initialize: () => ({}),
    languageFeatures: { requestRefresh: lifecycle.refresh },
    fileWatcher: {
      watchFiles: lifecycle.watchFiles,
      onDidChangeWatchedFiles: (callback: typeof lifecycle.changed) => {
        lifecycle.changed = callback
      },
    },
  }),
  createTypeScriptProject: vi.fn(),
}))

beforeAll(async () => {
  await import('../src/node.js')
})

describe('editor project file notifications', () => {
  it('registers native dependencies and configs after initialization', () => {
    lifecycle.initialize!({ initializationOptions: {} })
    lifecycle.initialized!()
    expect(lifecycle.setup).toHaveBeenCalledOnce()
    expect(lifecycle.watchFiles).toHaveBeenCalledWith([
      '**/*.{mpx,js,jsx,cjs,mjs,ts,tsx,cts,mts,json}',
    ])
  })

  it('refreshes diagnostics for native dependency create/change/delete and config edits', () => {
    lifecycle.initialize!({ initializationOptions: {} })
    for (const type of [1, 2, 3]) {
      lifecycle.changed!({
        changes: [{ uri: 'file:///workspace/shared.js', type }],
      })
      expect(lifecycle.refresh).toHaveBeenLastCalledWith(false)
    }
    lifecycle.changed!({
      changes: [{ uri: 'file:///workspace/tsconfig.json', type: 2 }],
    })
    expect(lifecycle.refresh).toHaveBeenLastCalledWith(true)
  })
})
