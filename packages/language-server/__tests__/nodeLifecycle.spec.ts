import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { URI } from 'vscode-uri'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'

const lifecycle = vi.hoisted(() => ({
  initialize: undefined as undefined | ((params: any) => unknown),
  initialized: undefined as undefined | (() => void),
  changed: undefined as undefined | ((event: any) => void),
  response: undefined as undefined | ((params: any) => void),
  project: undefined as any,
  services: [] as {
    config: string
    languageService: object
    tryAddFile: any
    dispose: any
  }[],
  refresh: vi.fn(),
  watchFiles: vi.fn(),
  setup: vi.fn(),
}))

vi.mock('@volar/language-server/node', () => ({
  createConnection: () => ({
    listen() {},
    onNotification: (_method: string, callback: typeof lifecycle.response) => {
      lifecycle.response = callback
    },
    sendNotification: (_method: string, [id, _command, args]: any[]) => {
      lifecycle.response!([
        id,
        { configFileName: path.join(path.dirname(args.file), 'tsconfig.json') },
      ])
    },
    onInitialize: (callback: typeof lifecycle.initialize) => {
      lifecycle.initialize = callback
    },
    onInitialized: (callback: typeof lifecycle.initialized) => {
      lifecycle.initialized = callback
    },
    onShutdown() {},
  }),
  createServer: () => ({
    documents: { onDidClose() {}, get() {} },
    workspaceFolders: { all: [], has: () => false },
    configurations: { get() {}, onDidChange() {} },
    initialized: lifecycle.setup,
    shutdown() {},
    initialize: (_params: unknown, project: unknown) => {
      lifecycle.project = project
      return {}
    },
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

vi.mock('@volar/language-server/lib/project/typescriptProjectLs', () => ({
  // Exercise the IDE's real cache/dispose logic and real Mpx config parser.
  // Only the expensive Volar project allocation is replaced with a counted LS.
  createTypeScriptLS: async (
    ts: any,
    _locale: unknown,
    config: string,
    _server: unknown,
    _env: unknown,
    _folder: unknown,
    converter: unknown,
    create: any,
  ) => {
    await create({
      configFileName: config,
      projectHost: {
        getCompilationSettings: () => ({}),
        getProjectVersion: () => '',
      },
      sys: { ...ts.sys },
      uriConverter: converter,
    })
    const project = {
      config,
      languageService: {},
      tryAddFile: vi.fn(),
      dispose: vi.fn(),
    }
    lifecycle.services.push(project)
    return project
  },
}))

let root: string | undefined
beforeAll(async () => {
  await import('../src/node.js')
})
afterEach(async () => {
  lifecycle.project?.reload()
  await Promise.resolve()
  lifecycle.services = []
  if (root) fs.rmSync(root, { recursive: true, force: true })
  root = undefined
})

function start() {
  lifecycle.initialize!({ initializationOptions: {} })
}
async function projects() {
  root = fs.mkdtempSync(path.join(os.tmpdir(), 'mpx-ide-cache-'))
  for (const [folder, base] of [
    ['a', 'custom.rules.json'],
    ['b', 'other.rules.json'],
  ]) {
    fs.mkdirSync(path.join(root, folder))
    fs.writeFileSync(
      path.join(root, folder, 'tsconfig.json'),
      JSON.stringify({ extends: '../' + base, include: [] }),
    )
    fs.writeFileSync(
      path.join(root, base),
      JSON.stringify({ compilerOptions: { checkJs: true } }),
    )
  }
  start()
  const uri = (name: string) => URI.file(path.join(root!, name))
  const a = await lifecycle.project.getLanguageService(uri('a/index.mpx'))
  const b = await lifecycle.project.getLanguageService(uri('b/index.mpx'))
  return {
    uri,
    a,
    b,
    get: (name: string) => lifecycle.project.getLanguageService(uri(name)),
  }
}
function change(uri: URI, type = 2) {
  lifecycle.changed!({ changes: [{ uri: uri.toString(), type }] })
}

describe('editor project file notifications', () => {
  it('registers native dependencies and configs after initialization', () => {
    start()
    lifecycle.initialized!()
    expect(lifecycle.setup).toHaveBeenCalledOnce()
    expect(lifecycle.watchFiles).toHaveBeenCalledWith([
      '**/*.{mpx,js,jsx,cjs,mjs,ts,tsx,cts,mts,json}',
    ])
  })

  it('refreshes native and ordinary JSON changes without destroying cached projects', async () => {
    const p = await projects()
    for (const file of ['a/shared.js', 'a/data.json'])
      for (const type of [1, 2, 3]) change(p.uri(file), type)
    expect(lifecycle.refresh).toHaveBeenLastCalledWith(false)
    expect(await p.get('a/index.mpx')).toBe(p.a)
    expect(await p.get('b/index.mpx')).toBe(p.b)
    expect(lifecycle.services).toHaveLength(2)
    expect(
      lifecycle.services.every(p => p.dispose.mock.calls.length === 0),
    ).toBe(true)
  })

  it('disposes and recreates only projects reading a custom inherited config', async () => {
    const p = await projects()
    const [a, b] = lifecycle.services
    change(p.uri('custom.rules.json'))
    expect(await p.get('a/index.mpx')).not.toBe(p.a)
    expect(await p.get('b/index.mpx')).toBe(p.b)
    expect(a.dispose).toHaveBeenCalledOnce()
    expect(b.dispose).not.toHaveBeenCalled()
    expect(lifecycle.services).toHaveLength(3)
    expect(lifecycle.refresh).toHaveBeenLastCalledWith(true)
  })

  it.each(['tsconfig.json', 'package.json'])(
    'recreates cached projects for root/package changes: %s',
    async name => {
      const p = await projects()
      const previous = [...lifecycle.services]
      change(p.uri('a/' + name))
      expect(await p.get('a/index.mpx')).not.toBe(p.a)
      expect(await p.get('b/index.mpx')).not.toBe(p.b)
      expect(previous.every(p => p.dispose.mock.calls.length === 1)).toBe(true)
      expect(lifecycle.services).toHaveLength(4)
    },
  )

  it('invalidates every reader of a shared nested config', async () => {
    const p = await projects()
    fs.writeFileSync(
      path.join(root!, 'other.rules.json'),
      JSON.stringify({ extends: './custom.rules.json' }),
    )
    change(p.uri('other.rules.json'))
    const b = await p.get('b/index.mpx')
    change(p.uri('custom.rules.json'))
    expect(await p.get('a/index.mpx')).not.toBe(p.a)
    expect(await p.get('b/index.mpx')).not.toBe(b)
  })

  it('tracks failed config lookups so creating a missing base recreates its reader', async () => {
    const p = await projects()
    fs.writeFileSync(
      path.join(root!, 'custom.rules.json'),
      JSON.stringify({ extends: './missing.rules.json' }),
    )
    change(p.uri('custom.rules.json'))
    const a = await p.get('a/index.mpx')
    fs.writeFileSync(path.join(root!, 'missing.rules.json'), '{}')
    change(p.uri('missing.rules.json'), 1)
    expect(await p.get('a/index.mpx')).not.toBe(a)
    expect(await p.get('b/index.mpx')).toBe(p.b)
  })

  it('releases dependency subscriptions on reload and reads them again on recreation', async () => {
    const p = await projects()
    const previous = [...lifecycle.services]
    lifecycle.project.reload()
    await Promise.resolve()
    expect(previous.every(p => p.dispose.mock.calls.length === 1)).toBe(true)
    const a = await p.get('a/index.mpx')
    change(p.uri('custom.rules.json'))
    expect(await p.get('a/index.mpx')).not.toBe(a)
  })
})
