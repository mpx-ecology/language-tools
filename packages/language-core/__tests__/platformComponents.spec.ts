import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'
import * as ts from 'typescript'
import {
  createMpxLanguagePlugin,
  forEachEmbeddedCode,
  getDefaultCompilerOptions,
} from '../src'
import { createLanguage } from '@volar/language-core'
import { compileMpxSource } from './utils/compileMpxFixture'
import { getComponentProps } from '../../typescript-plugin/src/requests/getComponentProps'
import * as enhancedResolve from 'enhanced-resolve'
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  componentFileModes,
  createUsingComponentsPathResolver,
} from '../src/utils/formatUsingComponentsPath'
import {
  type TestLanguageService,
  createTestLanguageService,
} from './utils/createTestLanguageService'

export const fixtureRoot = path.resolve(
  __dirname,
  'fixtures/platform-components',
)
const require = createRequire(__filename)
const AddModePlugin = require('@mpxjs/webpack-plugin/lib/resolver/AddModePlugin')
const temporaryDirectories: string[] = []
const services: TestLanguageService[] = []
afterEach(() => {
  for (const service of services.splice(0)) service.dispose()
  for (const directory of temporaryDirectories.splice(0))
    fs.rmSync(directory, { recursive: true, force: true })
})

function temporaryFixture() {
  const directory = fs.mkdtempSync(
    path.join(path.dirname(fixtureRoot), '.platform-'),
  )
  temporaryDirectories.push(directory)
  fs.cpSync(fixtureRoot, directory, { recursive: true })
  return fs.realpathSync(directory)
}
function resolver(directory = fixtureRoot) {
  return createUsingComponentsPathResolver({
    baseUrl: directory,
    paths: {
      '@components/*': ['./*'],
      '@panel': ['./panel.mpx'],
      '@fallback': ['./missing', './panel'],
    },
  })
}
function files(
  resolve: ReturnType<typeof resolver>,
  request: string,
  directory = fixtureRoot,
) {
  return resolve(request, path.join(directory, 'index.mpx'))?.candidates.map(
    candidate => path.relative(directory, candidate.realFilename),
  )
}

describe('platform component resolution', () => {
  it.each([
    './panel',
    './panel.mpx',
    '@components/panel',
    '@panel',
    '@fallback',
  ])(
    'keeps ordinary, ali and ios identities for %s without choosing an active mode',
    request => {
      expect(files(resolver(), request)).toEqual([
        'panel.mpx',
        'panel.ali.mpx',
        'panel.ios.mpx',
      ])
    },
  )
  it('resolves paths relative to their declaring tsconfig without baseUrl', () => {
    const resolve = createUsingComponentsPathResolver({
      configFilePath: path.join(fixtureRoot, 'tsconfig.json'),
      paths: { '@panel': ['./panel'] },
    })
    expect(files(resolve, '@panel')).toEqual([
      'panel.mpx',
      'panel.ali.mpx',
      'panel.ios.mpx',
    ])
    const inherited = createUsingComponentsPathResolver({
      configFilePath: path.join(fixtureRoot, 'nested/tsconfig.json'),
      pathsBasePath: fixtureRoot,
      paths: { '@panel': ['./panel'] },
    })
    expect(files(inherited, '@panel')).toEqual([
      'panel.mpx',
      'panel.ali.mpx',
      'panel.ios.mpx',
    ])
  })
  it('supports platform-only components, explicit files, resource queries and plugin URLs', () => {
    const resolve = resolver()
    expect(files(resolve, './only-ios')).toEqual(['only-ios.ios.mpx'])
    expect(files(resolve, './panel.ios.demo.mpx')).toEqual([
      'panel.ios.demo.mpx',
    ])
    expect(files(resolve, './panel')).not.toContain('panel.ios.demo.mpx')
    expect(
      files(resolve, './panel.ios.mpx?mode=ali&env=demo&root=other'),
    ).toEqual(['panel.ios.mpx'])
    expect(files(resolve, './panel?mode=ios&env=demo')).toEqual(
      files(resolve, './panel'),
    )
    expect(
      resolve('plugin://demo/card', path.join(fixtureRoot, 'index.mpx'))
        ?.result,
    ).toBe('plugin://demo/card')
    expect(
      resolve('./missing', path.join(fixtureRoot, 'index.mpx'))?.error,
    ).toBe(true)
  })
  it('aggregates the real Mpx targets across supported build platforms', () => {
    const actualTargets = new Set<string>()
    for (const mode of componentFileModes) {
      const actual = enhancedResolve.create.sync({
        fileSystem: fs,
        extensions: ['.mpx', '.js'],
        plugins: [
          new AddModePlugin(
            'before-file',
            mode,
            {
              fileConditionRules: { include: () => true },
              defaultMode: ['android', 'harmony'].includes(mode)
                ? 'ios'
                : undefined,
            },
            'file',
          ),
        ],
      })
      const built = actual({}, fixtureRoot, './panel')
      if (typeof built === 'string')
        actualTargets.add(path.basename(built.split('?')[0]!))
    }
    expect(files(resolver(), './panel')?.sort()).toEqual(
      [...actualTargets].sort(),
    )
  })
  it('preserves file/index/extension order and package main across relative, alias and package requests', () => {
    const directory = temporaryFixture()
    fs.mkdirSync(path.join(directory, 'panel'))
    fs.writeFileSync(
      path.join(directory, 'panel/index.ios.mpx'),
      '<template><view /></template>',
    )
    fs.mkdirSync(path.join(directory, 'node_modules/test-platform'), {
      recursive: true,
    })
    fs.writeFileSync(
      path.join(directory, 'node_modules/test-platform/package.json'),
      JSON.stringify({ main: 'entry.js' }),
    )
    fs.writeFileSync(
      path.join(directory, 'node_modules/test-platform/entry.js'),
      'module.exports = {}',
    )
    fs.writeFileSync(
      path.join(directory, 'node_modules/test-platform/entry.ios.js'),
      'module.exports = {}',
    )
    const resolve = resolver(directory)
    expect(files(resolve, './panel', directory)).toEqual([
      'panel.mpx',
      'panel.ali.mpx',
      'panel.ios.mpx',
    ])
    expect(files(resolve, '@components/panel', directory)).toEqual([
      'panel.mpx',
      'panel.ali.mpx',
      'panel.ios.mpx',
    ])
    expect(files(resolve, 'test-platform', directory)).toEqual([
      'node_modules/test-platform/entry.js',
      'node_modules/test-platform/entry.ios.js',
    ])
    expect(files(resolve, './panel/index', directory)).toEqual([
      'panel/index.ios.mpx',
    ])
  })
  it('refreshes successful and missing results immediately after create, delete, rename and package-main edits', () => {
    const directory = temporaryFixture()
    const resolve = resolver(directory)
    expect(files(resolve, './changing', directory)).toEqual([])
    fs.writeFileSync(
      path.join(directory, 'changing.ios.mpx'),
      '<template><view /></template>',
    )
    expect(files(resolve, './changing', directory)).toEqual([
      'changing.ios.mpx',
    ])
    fs.renameSync(
      path.join(directory, 'changing.ios.mpx'),
      path.join(directory, 'changing.android.mpx'),
    )
    expect(files(resolve, './changing', directory)).toEqual([
      'changing.android.mpx',
    ])
    fs.unlinkSync(path.join(directory, 'changing.android.mpx'))
    expect(files(resolve, './changing', directory)).toEqual([])
    const pkg = path.join(directory, 'node_modules/test-platform')
    fs.mkdirSync(pkg, { recursive: true })
    fs.writeFileSync(path.join(pkg, 'a.mpx'), '<template><view /></template>')
    fs.writeFileSync(path.join(pkg, 'b.mpx'), '<template><view /></template>')
    fs.writeFileSync(path.join(pkg, 'package.json'), '{"main":"a.mpx"}')
    expect(files(resolve, 'test-platform', directory)).toEqual([
      'node_modules/test-platform/a.mpx',
    ])
    fs.writeFileSync(path.join(pkg, 'package.json'), '{"main":"b.mpx"}')
    expect(files(resolve, 'test-platform', directory)).toEqual([
      'node_modules/test-platform/b.mpx',
    ])
  })
  it('shares a lookup across sources and refreshes both after a variant changes', () => {
    const directory = temporaryFixture()
    const resolve = resolver(directory)
    const first = path.join(directory, 'first.mpx')
    const second = path.join(directory, 'second.mpx')
    const request = './shared'
    const variant = path.join(directory, 'shared.ios.mpx')
    const missing = resolve(request, first)
    expect(missing?.candidates).toEqual([])
    expect(resolve(request + '?root=second', second)).toBe(missing)

    fs.writeFileSync(variant, '<template><view /></template>')
    expect(resolve.getVersion(first)).toBe(1)
    expect(resolve.getVersion(second)).toBe(1)
    const found = resolve(request, first)
    expect(found?.result).toBe(variant)
    expect(resolve(request, second)).toBe(found)

    fs.unlinkSync(variant)
    expect(resolve(request, second)?.candidates).toEqual([])
    expect(resolve(request, first)?.candidates).toEqual([])
  })

  it('checks dependency fingerprints again outside a graph build', () => {
    const directory = temporaryFixture()
    const importer = path.join(directory, 'index.mpx')
    const variant = path.join(directory, 'during-build.ios.mpx')
    let graphStats: Map<string, fs.Stats | undefined> | undefined = new Map()
    const resolve = createUsingComponentsPathResolver(
      {},
      undefined,
      () => graphStats,
    )
    expect(resolve('./during-build', importer)?.candidates).toEqual([])
    fs.writeFileSync(variant, '<template><view /></template>')
    expect(resolve('./during-build', importer)?.candidates).toEqual([])

    graphStats = undefined
    expect(resolve.getVersion(importer)).toBe(1)
    expect(resolve('./during-build', importer)?.result).toBe(variant)
  })

  it('keeps bare package lookups separate across importer directories', () => {
    const directory = temporaryFixture()
    const resolve = resolver(directory)
    const targets = ['one', 'two'].map(name => {
      const importer = path.join(directory, name, 'index.mpx')
      const pkg = path.join(path.dirname(importer), 'node_modules', 'local')
      fs.mkdirSync(pkg, { recursive: true })
      fs.writeFileSync(path.join(pkg, 'package.json'), '{"main":"index.mpx"}')
      fs.writeFileSync(
        path.join(pkg, 'index.mpx'),
        '<template><view /></template>',
      )
      return { importer, target: path.join(pkg, 'index.mpx') }
    })
    for (const { importer, target } of targets) {
      expect(resolve('local', importer)?.result).toBe(target)
    }
  })

  it('reuses a lookup across directories until a nested package changes the scope', () => {
    const directory = temporaryFixture()
    const outer = path.join(directory, 'outer')
    const inner = path.join(directory, 'inner')
    fs.mkdirSync(outer)
    fs.mkdirSync(inner)
    const pkg = path.join(directory, 'node_modules', 'scoped-widget')
    fs.mkdirSync(pkg, { recursive: true })
    fs.writeFileSync(path.join(pkg, 'package.json'), '{"main":"index.mpx"}')
    const shared = path.join(pkg, 'index.mpx')
    fs.writeFileSync(shared, '<template><view /></template>')

    let batch: Map<string, fs.Stats | undefined> | undefined = new Map()
    const resolve = createUsingComponentsPathResolver(
      {},
      undefined,
      () => batch,
    )
    const outerImporter = path.join(outer, 'index.mpx')
    const innerImporter = path.join(inner, 'index.mpx')
    const result = resolve('scoped-widget', outerImporter)
    expect(result?.result).toBe(shared)
    expect(resolve('scoped-widget', innerImporter)).toBe(result)
    const relative = resolve('../panel', outerImporter)
    expect(resolve('../panel', innerImporter)).toBe(relative)
    expect(
      relative?.candidates.map(candidate =>
        path.basename(candidate.realFilename),
      ),
    ).toEqual(['panel.mpx', 'panel.ali.mpx', 'panel.ios.mpx'])

    batch = undefined
    const nested = path.join(inner, 'node_modules', 'scoped-widget')
    fs.mkdirSync(nested, { recursive: true })
    fs.writeFileSync(path.join(nested, 'package.json'), '{"main":"index.mpx"}')
    const innerFile = path.join(nested, 'index.mpx')
    fs.writeFileSync(innerFile, '<template><view /></template>')
    expect(resolve.getVersion(outerImporter)).toBe(0)
    const shadowVersion = resolve.getVersion(innerImporter)
    expect(shadowVersion).toBeGreaterThan(0)
    batch = new Map()
    expect(resolve('scoped-widget', innerImporter)?.result).toBe(innerFile)
    expect(resolve('scoped-widget', outerImporter)?.result).toBe(shared)

    batch = undefined
    fs.rmSync(path.dirname(nested), { recursive: true, force: true })
    fs.writeFileSync(
      path.join(inner, 'package.json'),
      '{"name":"scoped-widget","exports":"./self.mpx"}',
    )
    const self = path.join(inner, 'self.mpx')
    fs.writeFileSync(self, '<template><view /></template>')
    expect(resolve.getVersion(innerImporter)).toBeGreaterThan(shadowVersion)
    batch = new Map()
    expect(resolve('scoped-widget', innerImporter)?.result).toBe(self)
    expect(resolve('scoped-widget', outerImporter)?.result).toBe(shared)
  })

  it('canonicalizes symlink aliases and refreshes a retargeted link', () => {
    const directory = temporaryFixture()
    const resolve = resolver(directory)
    const alias = path.join(directory, 'linked.mpx')
    fs.symlinkSync(path.join(directory, 'panel.ios.mpx'), alias)
    expect(files(resolve, './linked.mpx', directory)).toEqual(['panel.ios.mpx'])
    fs.unlinkSync(alias)
    fs.symlinkSync(path.join(directory, 'panel.ali.mpx'), alias)
    expect(files(resolve, './linked.mpx', directory)).toEqual(['panel.ali.mpx'])
  })
})

it('keeps the service script and its mappings when omitting editor views', () => {
  const fileName = path.join(fixtureRoot, 'index.mpx')
  const snapshot = ts.ScriptSnapshot.fromString(
    fs.readFileSync(fileName, 'utf8'),
  )
  const generate = (serviceScriptOnly: boolean, customPlugin = false) => {
    const options = getDefaultCompilerOptions()
    if (customPlugin) options.plugins.push(() => ({ name: 'custom' }))
    const plugin = createMpxLanguagePlugin(
      ts,
      { baseUrl: fixtureRoot, paths: { '@components/*': ['./*'] } },
      options,
      (name: string) => name,
      undefined,
      true,
      { serviceScriptOnly },
    )
    try {
      const language = createLanguage([plugin], new Map(), () => {})
      const root = language.scripts.set(fileName, snapshot, 'mpx')!.generated!
        .root
      const script = plugin.typescript!.getServiceScript(root)!.code
      return {
        ids: [...forEachEmbeddedCode(root)].map(code => code.id),
        text: script.snapshot.getText(0, script.snapshot.getLength()),
        mappings: script.mappings.map(
          ({ sourceOffsets, generatedOffsets, lengths }) => ({
            sourceOffsets,
            generatedOffsets,
            lengths,
          }),
        ),
      }
    } finally {
      plugin.dispose()
    }
  }

  const full = generate(false)
  const service = generate(true)
  expect(full.ids).toContain('json_service')
  expect(full.ids).toContain('template')
  expect(service.ids).toEqual(['main', 'script_ts'])
  expect(service.text).toBe(full.text)
  expect(service.mappings).toEqual(full.mappings)
  expect(generate(true, true).ids).toEqual(full.ids)
})

it('updates only changed component registrations when watching files outside the project roots', async () => {
  const directory = temporaryFixture()
  const plugin = createMpxLanguagePlugin(
    ts,
    {},
    getDefaultCompilerOptions(),
    (fileName: string) => fileName,
    undefined,
    true,
  )
  try {
    const language = createLanguage([plugin], new Map(), () => {})
    const owner = path.join(directory, 'index.mpx')
    const snapshot = ts.ScriptSnapshot.fromString(
      '<script type="application/json">{"usingComponents":{"panel":"./external/nested/panel"}}</script>',
    )
    const code = language.scripts.set(owner, snapshot, 'mpx')!.generated!.root
    const root = code as import('../src').MpxVirtualCode
    const candidates = () =>
      root.sfc.json?.resolvedUsingComponents?.result
        .get('panel')
        ?.map(candidate => path.basename(candidate.realFilename!)) ?? []
    expect(candidates()).toEqual([])
    const getVersion = vi.spyOn(root, 'getExternalDependencyVersion')
    const invalidated = vi.fn()
    const version = plugin.getExternalFilesVersion(undefined, invalidated)
    expect(plugin.getExternalFilesVersion(undefined, invalidated)).toBe(version)
    expect(getVersion).not.toHaveBeenCalled()
    expect(invalidated).not.toHaveBeenCalled()

    const target = path.join(directory, 'external/nested/panel.ios.mpx')
    fs.mkdirSync(path.dirname(target), { recursive: true })
    fs.writeFileSync(target, '<template><view /></template>')
    await vi.waitFor(
      () =>
        expect(plugin.getExternalFilesVersion(undefined, invalidated)).not.toBe(
          version,
        ),
      { timeout: 4000 },
    )
    expect(invalidated.mock.calls).toEqual([[owner]])
    root.update(snapshot)
    expect(candidates()).toEqual(['panel.ios.mpx'])
    const added = plugin.getExternalFilesVersion(undefined)
    fs.unlinkSync(target)
    await vi.waitFor(
      () =>
        expect(plugin.getExternalFilesVersion(undefined, invalidated)).not.toBe(
          added,
        ),
      { timeout: 4000 },
    )
    expect(invalidated.mock.calls).toEqual([[owner], [owner]])
    root.update(snapshot)
    expect(candidates()).toEqual([])
  } finally {
    plugin.dispose()
  }
})

describe('platform component type sources', () => {
  it('retains all platform types for application registrations without mapping their paths into the page', () => {
    const directory = temporaryFixture()
    fs.writeFileSync(
      path.join(directory, 'app.mpx'),
      `<script>
import { createApp } from '@mpxjs/core'
createApp({})
</script>
<script type="application/json">{"usingComponents":{"demo-panel":"./panel"}}</script>`,
    )
    fs.writeFileSync(
      path.join(directory, 'index.mpx'),
      `<template><demo-panel value="{{ invalidValue }}" /></template>
<script setup lang="ts">
const invalidValue = { invalid: true }
defineExpose({ invalidValue })
</script>`,
    )
    const nested = path.join(directory, 'nested')
    fs.mkdirSync(nested)
    fs.copyFileSync(
      path.join(directory, 'index.mpx'),
      path.join(nested, 'index.mpx'),
    )
    const service = createTestLanguageService(directory)
    services.push(service)
    const { code, root } = service.getServiceScript('index.mpx')
    expect(code.match(/import __MPX_jsonComponent_0_\d from/g)).toHaveLength(3)
    expect(code).not.toContain("import './panel'")
    expect(service.getServiceScript('nested/index.mpx').code).toContain(
      'from "../panel.ios.mpx"',
    )
    expect(
      root.sfc.resolvedUsingComponents?.result.get('demo-panel'),
    ).toHaveLength(3)
    expect(
      propsFor(service)
        ?.find(prop => prop.name === 'value')
        ?.type?.split(' | ')
        .sort(),
    ).toEqual(['false', 'number', 'string', 'true', 'undefined'])
    expect(
      service.proxyLanguageService
        .getSemanticDiagnostics(service.file('index.mpx'))
        .map(diagnostic => diagnostic.code),
    ).toEqual([2322])
    const parentText = service.read('index.mpx')
    fs.writeFileSync(
      path.join(directory, 'panel.android.mpx'),
      `<template><text>{{ androidOnly }}</text></template>
<script setup lang="ts">
defineProps({ value: Number, androidOnly: Number })
defineExpose({})
</script>`,
    )
    expect(
      propsFor(service)?.find(prop => prop.name === 'androidOnly')?.type,
    ).toBe('number | undefined')
    expect(
      service
        .getServiceScript('index.mpx')
        .code.match(/import __MPX_jsonComponent_0_\d from/g),
    ).toHaveLength(4)
    expect(service.getServiceScript('nested/index.mpx').code).toContain(
      'from "../panel.android.mpx"',
    )
    fs.unlinkSync(path.join(directory, 'panel.android.mpx'))
    expect(propsFor(service)?.some(prop => prop.name === 'androidOnly')).toBe(
      false,
    )
    expect(service.getServiceScript('nested/index.mpx').code).not.toContain(
      'from "../panel.android.mpx"',
    )
    expect(service.read('index.mpx')).toBe(parentText)
  })
  it('imports every real candidate once while keeping every original completion mapping', () => {
    const service = createTestLanguageService(fixtureRoot)
    services.push(service)
    const { code, root } = service.getServiceScript('index.mpx')
    expect(code).toContain(
      'DemoPanel: __MPX_jsonComponent_0_0 as typeof __MPX_jsonComponent_0_0 | typeof __MPX_jsonComponent_0_1 | typeof __MPX_jsonComponent_0_2,',
    )
    expect(code.match(/import __MPX_jsonComponent_0_\d from/g)).toHaveLength(3)
    expect(
      root.sfc.json?.resolvedUsingComponents?.result.get('demo-panel'),
    ).toHaveLength(6)
    const script = [...forEachEmbeddedCode(root)].find(
      code => code.id === 'script_ts',
    )!
    const offset = service
      .read('index.mpx')
      .indexOf('@components/panel.mpx?root=demo')
    const mappings = script.mappings.filter(mapping =>
      mapping.sourceOffsets.includes(offset),
    )
    // The named imports have no source mapping; request completion stays independent.
    expect(code).toContain("import '@components/panel.mpx?root=demo'")
    expect(mappings).toHaveLength(1)
    expect(mappings[0]?.data).toMatchObject({
      completion: true,
      navigation: false,
      semantic: false,
      verification: false,
    })
  })
  it('preserves candidate prop types and explicit-file checks without an active platform', () => {
    const service = createTestLanguageService(fixtureRoot)
    services.push(service)
    const fileName = service.file('index.mpx')
    const diagnostics = service.proxyLanguageService
      .getSemanticDiagnostics(fileName)
      .filter(diagnostic => diagnostic.code === 2322)
    expect(diagnostics).toHaveLength(2)
    expect(
      diagnostics.map(diagnostic =>
        ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n'),
      ),
    ).toContain("Type 'string' is not assignable to type 'number'.")
    const valueType = propsFor(service)?.find(
      prop => prop.name === 'value',
    )?.type
    expect(valueType?.split(' | ').sort()).toEqual([
      'false',
      'number',
      'string',
      'true',
      'undefined',
    ])
  })
  it('updates candidates, prop metadata and host versions with unchanged parent text', () => {
    const directory = temporaryFixture()
    const service = createTestLanguageService(directory)
    services.push(service)
    const parent = service.file('index.mpx')
    expect(
      service
        .getServiceScript('index.mpx')
        .code.match(/import __MPX_jsonComponent_0_\d from/g),
    ).toHaveLength(3)
    expect(propsFor(service)?.some(prop => prop.name === 'androidOnly')).toBe(
      false,
    )
    const previousVersion = service.languageServiceHost.getScriptVersion(parent)
    fs.writeFileSync(
      path.join(directory, 'panel.android.mpx'),
      `<template><text>{{ androidOnly }}</text></template>
<script setup lang="ts">
defineProps({ value: Number, androidOnly: Number })
defineExpose({})
</script>`,
    )
    expect(service.languageServiceHost.getScriptVersion(parent)).not.toBe(
      previousVersion,
    )
    const { code, root } = service.getServiceScript('index.mpx')
    expect(code.match(/import __MPX_jsonComponent_0_\d from/g)).toHaveLength(4)
    expect(
      root.sfc.json?.resolvedUsingComponents?.result
        .get('demo-panel')
        ?.map(info => path.basename(info.realFilename!)),
    ).toContain('panel.android.mpx')
    expect(
      propsFor(service)?.find(prop => prop.name === 'androidOnly')?.type,
    ).toBe('number | undefined')
    fs.unlinkSync(path.join(directory, 'panel.android.mpx'))
    expect(service.getServiceScript('index.mpx').code).not.toContain(
      'from "./panel.android.mpx"',
    )
    expect(propsFor(service)?.some(prop => prop.name === 'androidOnly')).toBe(
      false,
    )
  })
})

it.each([
  'panel.mpx',
  'panel.ios.mpx',
  'panel.ali.mpx',
  'panel.ios.demo.mpx',
  'only-ios.ios.mpx',
  'index.mpx',
])('compiles the Mpx fixture %s with the real compiler', async file => {
  const fileName = path.join(fixtureRoot, file)
  const result = await compileMpxSource(
    fs.readFileSync(fileName, 'utf8'),
    fileName,
  )
  expect(result.code).toContain('createComponent')
})

function propsFor(service: TestLanguageService) {
  return getComponentProps.apply(
    {
      typescript: ts,
      language: service.language,
      languageService: service.languageService,
      languageServiceHost: service.languageServiceHost,
      isTsPlugin: false,
      getFileId: fileName => fileName,
    },
    [service.file('index.mpx'), 'demo-panel'],
  )
}
