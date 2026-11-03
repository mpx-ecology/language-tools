import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import {
  createLanguage,
  createLanguageService,
  createUriMap,
} from '@volar/language-service'
import {
  createMpxLanguagePlugin,
  getDefaultCompilerOptions,
} from '@mpxjs/language-core'
import * as ts from 'typescript'
import type { TextEdit } from 'vscode-languageserver-protocol'
import { TextDocument } from 'vscode-languageserver-textdocument'
import { URI } from 'vscode-uri'
import { afterEach, describe, expect, it } from 'vitest'
import { create as createJson } from '../src/plugins/mpx-sfc-json-json'
import { create as createLinks } from '../src/plugins/mpx-sfc-json-links'
import { createTestLanguageService } from '../../language-core/__tests__/utils/createTestLanguageService'

const fixtureRoot = path.join(__dirname, 'fixtures/static-json')
const services: ReturnType<typeof createLanguageService>[] = []
afterEach(() => services.splice(0).forEach(service => service.dispose()))

function setup(
  json: string,
  options: { language?: 'json' | 'js'; links?: boolean; uri?: URI } = {},
) {
  // | denotes the cursor in an intentionally incomplete editor document.
  const marked = `<template><view /></template>\n<script ${options.language === 'js' ? 'name="json"' : 'type="application/json"'}>\n${json}\n</script>`
  const offset = marked.indexOf('|')
  const text = marked.replace('|', '')
  const uri = options.uri ?? URI.file(path.join(fixtureRoot, 'test.mpx'))
  const document = TextDocument.create(uri.toString(), 'mpx', 0, text)
  const language = createLanguage(
    [
      createMpxLanguagePlugin<URI>(
        ts,
        { baseUrl: fixtureRoot, paths: { '@/*': ['./*'] } },
        getDefaultCompilerOptions(),
        uri => uri.fsPath,
      ),
    ],
    createUriMap(),
    () => {},
  )
  language.scripts.set(uri, ts.ScriptSnapshot.fromString(text), 'mpx')
  const service = createLanguageService(
    language,
    [createJson(), ...(options.links === false ? [] : [createLinks()])],
    { workspaceFolders: [] },
    {},
  )
  services.push(service)
  return {
    service,
    uri,
    document,
    complete: () =>
      service.getCompletionItems(uri, document.positionAt(offset)),
    hover: (needle: string) =>
      service.getHover(uri, document.positionAt(text.indexOf(needle) + 1)),
    diagnostics: () => service.getDiagnostics(uri),
  }
}

function diagnosticTexts(
  document: TextDocument,
  diagnostics: Awaited<ReturnType<ReturnType<typeof setup>['diagnostics']>>,
) {
  return diagnostics.map(diagnostic => document.getText(diagnostic.range))
}

describe('static JSON in mapped Mpx SFCs', () => {
  it('keeps existing component hover, boolean completion and diagnostics active', async () => {
    const hover = await setup('{ "component": true }').hover('component')
    expect(hover?.contents).toMatchObject({
      value: expect.stringContaining('自定义组件声明'),
    })
    const { complete, document } = setup('{ "component": | }')
    const result = await complete()
    const item = result.items.find(item => item.label === 'true')!
    expect(item).toBeDefined()
    expect(
      TextDocument.applyEdits(document, [item.textEdit as TextEdit]),
    ).toContain('"component": true')
    const invalid = setup('{ "component": "wrong" }')
    expect(
      diagnosticTexts(invalid.document, await invalid.diagnostics()),
    ).toContain('"wrong"')
  })

  it('completes componentGenerics at the top level and preserves page fields', async () => {
    const { complete, document } = setup('{ | }')
    const items = (await complete()).items
    expect(items.map(item => item.label)).toEqual(
      expect.arrayContaining([
        'component',
        'componentGenerics',
        'usingComponents',
        'navigationBarTitleText',
      ]),
    )
    const generic = items.find(item => item.label === 'componentGenerics')!
    expect(
      TextDocument.applyEdits(document, [generic.textEdit as TextEdit]),
    ).toContain('"componentGenerics"')
    expect(
      (await setup('{ "componentGenerics": {} }').hover('componentGenerics'))
        ?.contents,
    ).toMatchObject({ value: expect.stringContaining('抽象节点') })
  })

  it('completes and documents a generic default component path', async () => {
    const result = await setup(
      '{ "componentGenerics": { "node": { | } } }',
    ).complete()
    expect(result.items.map(item => item.label)).toContain('default')
    const hover = await setup(
      '{ "componentGenerics": { "node": { "default": "./panel.mpx" } } }',
    ).hover('default')
    expect(hover?.contents).toMatchObject({
      value: expect.stringContaining('默认组件'),
    })
  })

  it.each([
    ['{ "usingComponents": { "panel": 123 } }', '123'],
    ['{ "componentPlaceholder": { "panel": 123 } }', '123'],
    ['{ "componentGenerics": { "node": 123 } }', '123'],
    ['{ "componentGenerics": { "node": null } }', 'null'],
    ['{ "componentGenerics": { "node": { "default": 123 } } }', '123'],
    ['{ "componentGenerics": [] }', '[]'],
  ])('diagnoses nested value types: %s', async (json, invalidText) => {
    const fixture = setup(json)
    const diagnostics = await fixture.diagnostics()
    expect(
      diagnostics.some(diagnostic =>
        diagnostic.message.includes('Incorrect type'),
      ),
    ).toBe(true)
    expect(diagnosticTexts(fixture.document, diagnostics)).toContain(
      invalidText,
    )
  })

  it('accepts compiler-supported static config, comments, trailing commas and extension fields', async () => {
    const content = fs.readFileSync(
      path.join(fixtureRoot, 'component.mpx'),
      'utf8',
    )
    const json = content
      .split('<script type="application/json">\n')[1]
      .split('</script>')[0]
    const fixture = setup(json)
    expect(await fixture.diagnostics()).toEqual([])
    const links = await fixture.service.getDocumentLinks(fixture.uri)
    expect(links).toHaveLength(3)
    expect(links.map(link => fixture.document.getText(link.range))).toEqual(
      expect.arrayContaining([
        './panel.mpx?root=demo',
        '@/panel',
        './native/index',
      ]),
    )
    expect(links.map(link => link.target)).toContain(
      URI.file(path.join(fixtureRoot, 'panel.mpx')).toString(),
    )
  })

  it('keeps missing component path diagnostics mapped to the source', async () => {
    const fixture = setup('{ "usingComponents": { "panel": "./missing.mpx" } }')
    const diagnostics = await fixture.diagnostics()
    expect(diagnostics).toHaveLength(1)
    expect(diagnostics[0]).toMatchObject({ source: 'mpx-json', code: '4001' })
    expect(diagnosticTexts(fixture.document, diagnostics)[0]).toContain(
      './missing.mpx',
    )
  })

  it('preserves existing TypeScript path completions in static usingComponents', () => {
    const service = createTestLanguageService(fixtureRoot)
    try {
      const fileName = service.file('component.mpx')
      const offset = service.read('component.mpx').indexOf('./panel.mpx') + 2
      const result = service.proxyLanguageService.getCompletionsAtPosition(
        fileName,
        offset,
        {},
      )
      expect(result?.entries.map(item => item.name)).toContain('panel.mpx')
    } finally {
      service.dispose()
    }
  })

  it('keeps page enum completions and validation', async () => {
    const result = await setup('{ "navigationBarTextStyle": | }').complete()
    expect(result.items.map(item => item.label)).toEqual(
      expect.arrayContaining(['"white"', '"black"']),
    )
    const fixture = setup('{ "navigationBarTextStyle": "red" }')
    expect(
      diagnosticTexts(fixture.document, await fixture.diagnostics()),
    ).toContain('"red"')
  })

  it('accepts Mpx string path forms without adding Schema format restrictions', async () => {
    const fixture = setup(
      JSON.stringify({
        usingComponents: {
          relative: './panel.mpx?root=async&placeholder=view',
          npm: '@scope/native-panel/index',
          plugin: 'plugin://demo/panel',
          alias: '@/panel',
          theme: '@themeComponent',
          binding: '{{themeComponent}}',
        },
        componentPlaceholder: {
          relative: 'view',
          npm: 'text',
          alias: 'registered-panel',
        },
      }),
      { links: false },
    )
    // This isolates new Schema constraints from the pre-existing path resolver.
    expect(await fixture.diagnostics()).toEqual([])
  })

  it('keeps generic extension keys and optional defaults open', async () => {
    const fixture = setup(
      JSON.stringify({
        componentGenerics: {
          enabled: true,
          disabled: false,
          empty: {},
          extended: {
            default: 'plugin://demo/panel',
            customNativeOption: { enabled: true },
          },
        },
      }),
    )
    expect(await fixture.diagnostics()).toEqual([])
  })

  it.each([
    ['navigationStyle', ['default', 'custom']],
    ['backgroundTextStyle', ['dark', 'light']],
    ['pageOrientation', ['auto', 'portrait', 'landscape']],
    ['renderer', ['webview', 'skyline', 'xr-frame']],
  ])('preserves existing %s page completion values', async (field, values) => {
    const result = await setup(`{ "${field}": | }`).complete()
    expect(result.items.map(item => item.label)).toEqual(
      expect.arrayContaining(values.map(value => JSON.stringify(value))),
    )
    for (const value of values) {
      expect(
        await setup(JSON.stringify({ [field]: value })).diagnostics(),
      ).toEqual([])
    }
  })

  it('accepts app/page fields without requiring a component declaration', async () => {
    const fixture = setup(
      JSON.stringify({
        pages: ['./panel.mpx'],
        window: {
          navigationBarTitleText: 'Mpx',
          navigationBarTextStyle: 'white',
        },
        navigationBarTitleText: 'Mpx page',
        enablePullDownRefresh: true,
        usingComponents: { panel: './panel.mpx' },
        styleIsolation: 'apply-shared',
        customPlatformOption: { enabled: true },
      }),
    )
    expect(await fixture.diagnostics()).toEqual([])
  })

  it('keeps npm component path links and diagnostics working', async () => {
    const temporaryRoot = fs.mkdtempSync(
      path.join(os.tmpdir(), 'mpx-static-json-npm-'),
    )
    try {
      fs.mkdirSync(path.join(temporaryRoot, 'node_modules/@demo'), {
        recursive: true,
      })
      fs.symlinkSync(
        path.join(fixtureRoot, 'native'),
        path.join(temporaryRoot, 'node_modules/@demo/panel'),
        'dir',
      )
      const fixture = setup(
        '{ "usingComponents": { "panel": "@demo/panel/index" } }',
        { uri: URI.file(path.join(temporaryRoot, 'page.mpx')) },
      )
      expect(await fixture.diagnostics()).toEqual([])
      const links = await fixture.service.getDocumentLinks(fixture.uri)
      expect(links).toHaveLength(1)
      expect(fixture.document.getText(links[0].range)).toContain(
        '@demo/panel/index',
      )
      expect(URI.parse(links[0].target!).fsPath).toBe(
        path.join(fixtureRoot, 'native/index.js'),
      )
    } finally {
      fs.rmSync(temporaryRoot, { recursive: true, force: true })
    }
  })

  it('does not apply static Schema diagnostics to JSON JS', async () => {
    const fixture = setup(
      'module.exports = { component: "wrong", usingComponents: { panel: 123 } }',
      { language: 'js' },
    )
    expect(await fixture.diagnostics()).toEqual([])
  })
})
