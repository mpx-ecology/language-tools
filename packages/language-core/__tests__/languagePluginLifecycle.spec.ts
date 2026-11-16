import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import * as ts from 'typescript'
import { createLanguage } from '@volar/language-core'
import { expect, it, vi } from 'vitest'
import {
  MpxVirtualCode,
  createMpxLanguagePlugin,
  getDefaultCompilerOptions,
} from '../src'

const snapshot = ts.ScriptSnapshot.fromString('<template><view /></template>')

it('transfers fallback global types to a live file after its owner is removed', () => {
  const plugin = createMpxLanguagePlugin(
    ts,
    {},
    getDefaultCompilerOptions(),
    (name: string) => name,
    undefined,
    true,
    { serviceScriptOnly: true },
  )
  const language = createLanguage([plugin], new Map(), () => {})
  const set = (name: string) =>
    language.scripts.set(name, snapshot, 'mpx')!.generated!.root
  const text = (root: ReturnType<typeof set>) => {
    const code = plugin.typescript!.getServiceScript(root)!.code.snapshot
    return code.getText(0, code.getLength())
  }
  try {
    const first = set('/fallback-first.mpx')
    expect(text(first)).toContain('declare global')
    const second = set('/fallback-second.mpx')
    expect(text(second)).not.toContain('declare global')
    language.scripts.delete('/fallback-first.mpx')
    expect(text(second)).toContain('declare global')
    const recreated = set('/fallback-first.mpx')
    expect(text(recreated)).not.toContain('declare global')
    language.scripts.delete('/fallback-second.mpx')
    expect(text(recreated)).toContain('declare global')
  } finally {
    plugin.dispose()
  }
})

it('removes private service-only files even without dependency watching', () => {
  const options = getDefaultCompilerOptions()
  options.__setupedGlobalTypes = true
  const plugin = createMpxLanguagePlugin(
    ts,
    {},
    options,
    (name: string) => name,
    undefined,
    false,
    { serviceScriptOnly: true },
  )
  const language = createLanguage([plugin], new Map(), () => {})
  try {
    const first = language.scripts.set('/private.mpx', snapshot, 'mpx')!
      .generated!.root
    language.scripts.delete('/private.mpx')
    const second = language.scripts.set('/private.mpx', snapshot, 'mpx')!
      .generated!.root
    expect(second).not.toBe(first)
  } finally {
    plugin.dispose()
  }
})

it('runs custom plugin cleanup in projects without dependency watching', () => {
  const options = getDefaultCompilerOptions()
  options.__setupedGlobalTypes = true
  const disposeFile = vi.fn()
  const dispose = vi.fn()
  options.plugins.push(() => ({ name: 'lifecycle-test', disposeFile, dispose }))
  const plugin = createMpxLanguagePlugin(
    ts,
    {},
    options,
    (name: string) => name,
  )
  const language = createLanguage([plugin], new Map(), () => {})
  language.scripts.set('/custom.mpx', snapshot, 'mpx')
  language.scripts.delete('/custom.mpx')
  plugin.dispose()
  expect(disposeFile.mock.calls).toEqual([['/custom.mpx']])
  expect(dispose).toHaveBeenCalledTimes(1)
})

it('invalidates application consumers when a packages entry changes its manifest', async () => {
  const root = fs.realpathSync(
    fs.mkdtempSync(path.join(os.tmpdir(), 'mpx-app-consumers-')),
  )
  const nested = path.join(root, 'nested')
  fs.mkdirSync(nested)
  const manifest = path.join(nested, 'package.json')
  fs.writeFileSync(manifest, '{"main":"other.mpx"}')
  fs.writeFileSync(
    path.join(nested, 'other.mpx'),
    '<template><view /></template>',
  )
  const plugin = createMpxLanguagePlugin(
    ts,
    { configFilePath: path.join(root, 'tsconfig.json') },
    getDefaultCompilerOptions(),
    (name: string) => name,
    undefined,
    true,
  )
  const roots = new Map<string, MpxVirtualCode>()
  const ctx = {
    getAssociatedScript: (name: string) => {
      const code = roots.get(name)
      return code && { generated: { root: code } }
    },
  } as Parameters<NonNullable<typeof plugin.createVirtualCode>>[3]
  const add = (name: string, source: string) => {
    fs.writeFileSync(name, source)
    const code = plugin.createVirtualCode!(
      name,
      'mpx',
      ts.ScriptSnapshot.fromString(source),
      ctx,
    )!
    roots.set(name, code)
    return code
  }
  try {
    add(
      path.join(root, 'app.mpx'),
      '<script type="application/json">{"packages":["./nested"],"usingComponents":{"outer":"./panel"}}</script>',
    )
    add(
      path.join(nested, 'app.mpx'),
      '<script type="application/json">{"usingComponents":{"inner":"./panel"}}</script>',
    )
    const unrelated = path.join(root, 'other-page.mpx')
    add(unrelated, '<template><view /></template>')
    const page = path.join(nested, 'page.mpx')
    const code = add(page, '<template><view /></template>')
    expect(code.sfc.application?.fileName).toBe(path.join(nested, 'app.mpx'))
    const changed = new Set<string>()
    plugin.getExternalFilesVersion(undefined, name => changed.add(name))
    changed.clear()
    fs.writeFileSync(manifest, '{"main":"app.mpx"}')
    await vi.waitFor(
      () => {
        plugin.getExternalFilesVersion(undefined, name => changed.add(name))
        expect(changed.has(page)).toBe(true)
      },
      { timeout: 4000 },
    )
    expect(changed.has(unrelated)).toBe(false)
    plugin.updateVirtualCode!(page, code, snapshot, ctx)
    expect(code.sfc.application?.fileName).toBe(path.join(root, 'app.mpx'))
  } finally {
    plugin.dispose()
    fs.rmSync(root, { recursive: true, force: true })
  }
})

it('shares missing app lookups within a graph while preserving live associations and the next graph', () => {
  const root = '/mpx-application-lookup-test'
  const plugin = createMpxLanguagePlugin(
    ts,
    { configFilePath: root + '/tsconfig.json' },
    getDefaultCompilerOptions(),
    (name: string) => name,
  )
  const roots = new Map<string, MpxVirtualCode>()
  const associated = vi.fn((name: string) => {
    const code = roots.get(name)
    return code && { generated: { root: code } }
  })
  const ctx = { getAssociatedScript: associated } as Parameters<
    NonNullable<typeof plugin.createVirtualCode>
  >[3]
  const add = (name: string, source: string) => {
    const code = plugin.createVirtualCode!(
      name,
      'mpx',
      ts.ScriptSnapshot.fromString(source),
      ctx,
    )!
    roots.set(name, code)
    return code
  }
  try {
    add(root + '/app.mpx', '<script type="application/json">{}</script>')
    const pages = ['/pages/first.mpx', '/pages/second.mpx'].map(
      name => root + name,
    )
    plugin.withComponentFileStats(() =>
      pages.forEach(name => add(name, '<template><view /></template>')),
    )
    expect(
      associated.mock.calls.filter(
        ([name]) => name === root + '/pages/app.mpx',
      ),
    ).toHaveLength(1)
    expect(
      associated.mock.calls.filter(([name]) => name === root + '/app.mpx'),
    ).toHaveLength(2)
    add(root + '/pages/app.mpx', '<script type="application/json">{}</script>')
    plugin.withComponentFileStats(() => {
      for (const name of pages) {
        const code = roots.get(name)!
        plugin.updateVirtualCode!(name, code, snapshot, ctx)
        expect(code.sfc.application?.fileName).toBe(root + '/pages/app.mpx')
      }
    })
  } finally {
    plugin.dispose()
  }
})
