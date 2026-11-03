import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'
import * as ts from 'typescript'
import { forEachEmbeddedCode } from '../src'
import { compileMpxSource } from './utils/compileMpxFixture'
import { getComponentProps } from '../../typescript-plugin/src/requests/getComponentProps'
import * as enhancedResolve from 'enhanced-resolve'
import { afterEach, describe, expect, it } from 'vitest'
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
  it('canonicalizes symlink aliases to the actual file identity', () => {
    const directory = temporaryFixture()
    fs.symlinkSync(
      path.join(directory, 'panel.ios.mpx'),
      path.join(directory, 'linked.mpx'),
    )
    expect(files(resolver(directory), './linked.mpx', directory)).toEqual([
      'panel.ios.mpx',
    ])
  })
})

describe('platform component type sources', () => {
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
  it('preserves candidate prop types, explicit-file checks and hover without an active platform', () => {
    const service = createTestLanguageService(fixtureRoot)
    services.push(service)
    const fileName = service.file('index.mpx')
    const source = service.read('index.mpx')
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
    const { code } = service.getServiceScript('index.mpx')
    const hover = ts.displayPartsToString(
      service.languageService.getQuickInfoAtPosition(
        fileName,
        source.length + code.indexOf('DemoPanel:') + 1,
        10_000,
      )?.displayParts,
    )
    for (const constructor of [
      'StringConstructor',
      'NumberConstructor',
      'BooleanConstructor',
    ])
      expect(hover).toContain(constructor)
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
