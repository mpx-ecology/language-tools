import * as fs from 'node:fs'
import * as path from 'node:path'
import * as ts from 'typescript'
import * as vm from 'node:vm'
import type { IRequests } from '../../typescript-plugin/src/requests'
import {
  createLanguage,
  createLanguageService,
  createUriMap,
} from '@volar/language-service'
import {
  createMpxLanguagePlugin,
  getDefaultCompilerOptions,
} from '@mpxjs/language-core'
import type * as vscode from 'vscode-languageserver-protocol'
import { TextDocument } from 'vscode-languageserver-textdocument'
import { URI } from 'vscode-uri'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { create as createTemplatePlugin } from '../src/plugins/mpx-sfc-template'
import {
  createRegistrationEdit,
  readComponentConfig,
} from '../src/utils/componentRegistration'

const root = path.resolve(__dirname, 'fixtures/component-registration')
const component =
  '<template><view /></template>\n<script type="application/json">{ "component": true }</script>'
const services: { dispose(): void }[] = []
afterEach(() => services.splice(0).forEach(service => service.dispose()))

function setup(
  marked: string,
  extraFiles: Record<string, string | undefined> = {},
  options: ts.CompilerOptions = {},
  file = 'page.mpx',
  knownNames?: string[] | (() => Promise<string[]>),
) {
  const uri = URI.file(path.join(root, file))
  const files = new Map(
    Object.entries(extraFiles).map(([name, text]) => [
      path.join(root, name),
      text,
    ]),
  )
  const language = createLanguage(
    [
      createMpxLanguagePlugin<URI>(
        ts,
        {},
        getDefaultCompilerOptions(),
        uri => uri.fsPath,
      ),
    ],
    createUriMap(),
    () => {},
  )
  let onChange:
    | ((params: vscode.DidChangeWatchedFilesParams) => void)
    | undefined
  const disposeWatcher = vi.fn()
  const readFile = (uri: URI) =>
    files.has(uri.fsPath) ? files.get(uri.fsPath) : ts.sys.readFile(uri.fsPath)
  const readDirectory = vi.fn((uri: URI): [string, number][] => {
    let entries: [string, number][] = []
    if (fs.existsSync(uri.fsPath))
      entries = fs
        .readdirSync(uri.fsPath, { withFileTypes: true })
        .map(entry => [entry.name, entry.isDirectory() ? 2 : 1])
    const names = new Map(entries)
    for (const [name, text] of files) {
      const relative = path.relative(uri.fsPath, name)
      if (relative.startsWith('..') || path.isAbsolute(relative)) continue
      const [child, ...rest] = relative.split(path.sep)
      if (rest.length) {
        if (text !== undefined) names.set(child, 2)
      } else if (text !== undefined) names.set(child, 1)
      else names.delete(child)
    }
    return [...names]
  })
  const service = createLanguageService(
    language,
    [
      createTemplatePlugin(
        () =>
          knownNames
            ? ({
                getComponentNames: async () =>
                  typeof knownNames === 'function' ? knownNames() : knownNames,
              } as unknown as IRequests)
            : undefined,
        ts,
      ),
    ],
    {
      workspaceFolders: [URI.file(root)],
      onDidChangeWatchedFiles: callback => {
        onChange = callback
        return { dispose: disposeWatcher }
      },
      fs: {
        readFile,
        stat: uri => {
          try {
            const stat = fs.statSync(uri.fsPath)
            return {
              type: stat.isDirectory() ? 2 : 1,
              ctime: 0,
              mtime: stat.mtimeMs,
              size: stat.size,
            }
          } catch {
            return undefined
          }
        },
        readDirectory,
      },
    },
    {
      mpx: {
        compilerOptions: getDefaultCompilerOptions(),
        typescriptCompilerOptions: options,
      },
    },
  )
  services.push(service)
  let offset: number
  let document: TextDocument
  let version = 0
  function update(marked: string) {
    offset = marked.indexOf('|')
    const text = marked.replace('|', '')
    language.scripts.set(uri, ts.ScriptSnapshot.fromString(text), 'mpx')
    document = TextDocument.create(uri.toString(), 'mpx', version++, text)
  }
  update(marked)
  return {
    service,
    uri,
    language,
    files,
    update,
    readDirectory,
    disposeWatcher,
    get document() {
      return document
    },
    async complete(triggerKind: 1 | 3 = 1) {
      return (
        await service.getCompletionItems(uri, document.positionAt(offset), {
          triggerKind,
        })
      ).items
    },
    resolve: (item: vscode.CompletionItem) =>
      service.resolveCompletionItem(JSON.parse(JSON.stringify(item))),
    async actions() {
      const position = document.positionAt(offset)
      const actions =
        (await service.getCodeActions(
          uri,
          { start: position, end: position },
          { diagnostics: [], only: ['quickfix'] },
        )) ?? []
      return await Promise.all(
        actions.map(action => service.resolveCodeAction(action)),
      )
    },
    notify(name: string, type: 1 | 2 | 3 = 2) {
      onChange?.({
        changes: [{ uri: URI.file(path.join(root, name)).toString(), type }],
      })
    },
  }
}
function auto(items: vscode.CompletionItem[]) {
  return items.filter(item => item.detail === '自动注册 usingComponents')
}
function apply(document: TextDocument, item: vscode.CompletionItem) {
  return TextDocument.applyEdits(document, [
    item.textEdit as vscode.TextEdit,
    ...(item.additionalTextEdits ?? []),
  ])
}

describe('mapped workspace component registration', () => {
  it.each([
    '<template><demo-ca| /></template>\n<script type="application/json">{}</script>',
    '<template><demo-ca| /></template>',
    '<template><demo-ca| /></template>\n<script type="application/json">\n</script>',
    '<template>\n  <!-- 中文注释 -->\n  <demo-ca| />\n</template>\n<script setup>\nconst value = 1\ndefineExpose({ value })\n</script>',
  ])(
    'resolves source edits for both existing and missing blocks: %s',
    async source => {
      const test = setup(source)
      const item = (await test.complete()).find(
        item => item.label === 'demo-card',
      )
      expect(item).toBeDefined()
      const resolved = await test.resolve(item!)
      const text = apply(test.document, resolved)
      expect(text).toContain('<demo-card />')
      expect(text).toContain('"demo-card": "./components/demo-card.mpx"')
      expect(readComponentConfig(ts, text).reason).toBeUndefined()
      expect(readComponentConfig(ts, text).registrations.get('demo-card')).toBe(
        './components/demo-card.mpx',
      )
      expect(resolved.command).toBeUndefined()
    },
  )

  it('offers a single-source-document WorkspaceEdit Quick Fix', async () => {
    const test = setup('<template><demo-card| /></template>')
    const actions = await test.actions()
    expect(actions).toHaveLength(1)
    expect(Object.keys(actions[0].edit!.changes!)).toEqual([test.document.uri])
    const text = TextDocument.applyEdits(
      test.document,
      actions[0].edit!.changes![test.document.uri],
    )
    expect(text).toContain('"demo-card": "./components/demo-card.mpx"')
  })

  it('merges JSON comments and follows extensionless path style', async () => {
    const source =
      '<template><demo-ca| /></template>\n<script type="application/json">\n{\n  // 标题保持原样\n  "navigationBarTitleText": "页面",\n  "usingComponents": {\n    "existing": "./components/existing" // 已注册\n  }\n}\n</script>'
    const test = setup(source)
    const item = auto(await test.complete()).find(
      item => item.label === 'demo-card',
    )!
    const text = apply(test.document, await test.resolve(item))
    expect(text).toContain('"existing": "./components/existing", // 已注册')
    expect(text).toContain('// 标题保持原样')
    expect(readComponentConfig(ts, text).registrations.get('demo-card')).toBe(
      './components/demo-card',
    )
  })

  it('merges JS literal comments and preserves single quotes and trailing commas', async () => {
    const test = setup(
      "<template><demo-ca| /></template>\n<script name=\"json\">\nmodule.exports = {\n  // 原有配置\n  usingComponents: {\n    'existing': './components/existing.mpx', // 保留\n  },\n}\n</script>",
    )
    const resolved = await test.resolve(auto(await test.complete())[0])
    const text = apply(test.document, resolved)
    expect(text).toContain("'demo-card': './components/demo-card.mpx',")
    expect(text).toContain("'existing': './components/existing.mpx', // 保留")
    expect(readComponentConfig(ts, text).reason).toBeUndefined()
  })

  it('reuses a configured alias and extension style without rewriting existing paths', async () => {
    const test = setup(
      '<template><demo-ca| /></template>\n<script type="application/json">{ "usingComponents": { "existing": "@/components/existing" } }</script>',
      {},
      { baseUrl: root, paths: { '@/*': ['./*'] } },
    )
    const item = auto(await test.complete())[0]
    expect(item.labelDetails?.description).toBe('@/components/demo-card')
    const text = apply(test.document, await test.resolve(item))
    expect(text).toContain('"demo-card": "@/components/demo-card"')
    expect(text).toContain('"existing": "@/components/existing"')
  })

  it('keeps an explicit extension when omission would resolve a directory index instead', async () => {
    const test = setup(
      '<template><demo-ca| /></template><script type="application/json">{ "usingComponents": { "existing": "./components/existing" } }</script>',
      {
        'components/demo-card/index.mpx': component,
      },
    )
    const items = auto(await test.complete())
    const file = items.find(
      item => item.labelDetails?.description === './components/demo-card.mpx',
    )!
    expect(file).toBeDefined()
    const text = apply(test.document, await test.resolve(file))
    expect(readComponentConfig(ts, text).registrations.get('demo-card')).toBe(
      './components/demo-card.mpx',
    )
  })

  it('is idempotent after acceptance and refreshes the same completion session after undo', async () => {
    const original =
      '<template><demo-ca| /></template>\n<script type="application/json">{}</script>'
    const test = setup(original)
    const item = auto(await test.complete())[0]
    const accepted = apply(test.document, await test.resolve(item))
    test.update(accepted.replace('<demo-card', '<demo-card|'))
    expect(auto(await test.complete(3))).toEqual([])
    expect(await test.actions()).toEqual([])
    expect(
      createRegistrationEdit(ts, test.document, 'demo-card', './wrong.mpx')
        .edits,
    ).toEqual([])
    test.update(original)
    expect(auto(await test.complete(3)).map(item => item.label)).toContain(
      'demo-card',
    )
  })

  it.each([
    '{ "usingComponents": { "demo-card": "./other.mpx" } }',
    '{ "usingComponents": { "alias-card": "./components/demo-card" } }',
  ])(
    'does not override local registration or add another name for the same file: %s',
    async config => {
      const test = setup(
        `<template><demo-ca| /></template>\n<script type="application/json">${config}</script>`,
      )
      expect(auto(await test.complete())).toEqual([])
    },
  )

  it.each([
    ['global-card', './components/demo-card.mpx'],
    ['demo-card', './other.mpx'],
    ['global-card', '@/components/demo-card?root=shared'],
  ])(
    'does not duplicate app global registration %s = %s',
    async (name, target) => {
      const test = setup(
        '<template><demo-ca| /></template>',
        {
          'app.mpx': `<script type="application/json">{ "usingComponents": { "${name}": "${target}" } }</script>`,
        },
        { baseUrl: root, paths: { '@/*': ['./*'] } },
      )
      expect(auto(await test.complete())).toEqual([])
      expect(await test.actions()).toEqual([])
    },
  )

  it('reuses existing TypeScript component names including PascalCase GlobalComponents', async () => {
    const test = setup(
      '<template><demo-ca| /></template>',
      {},
      {},
      'page.mpx',
      ['DemoCard'],
    )
    expect(auto(await test.complete())).toEqual([])
  })

  it('keeps same-name candidates separate by source path', async () => {
    const test = setup('<template><demo-card| /></template>', {
      'other/demo-card.mpx': component,
    })
    const items = auto(await test.complete()).filter(
      item => item.label === 'demo-card',
    )
    expect(items.map(item => item.labelDetails?.description)).toEqual([
      './components/demo-card.mpx',
      './other/demo-card.mpx',
    ])
    expect((await test.actions()).map(action => action.title)).toHaveLength(2)
    const text = apply(test.document, await test.resolve(items[1]))
    expect(text).toContain('"demo-card": "./other/demo-card.mpx"')
  })

  it('invalidates directory discovery on create/delete/rename events', async () => {
    const test = setup('<template><de| /></template>')
    expect(auto(await test.complete()).map(item => item.label)).toContain(
      'demo-card',
    )
    const calls = test.readDirectory.mock.calls.length
    await test.complete()
    expect(test.readDirectory).toHaveBeenCalledTimes(calls)
    test.files.set(path.join(root, 'components/new-card.mpx'), component)
    test.files.set(path.join(root, 'components/demo-card.mpx'), undefined)
    test.notify('components/demo-card.mpx', 3)
    test.notify('components/new-card.mpx', 1)
    const items = auto(await test.complete())
    expect(items.map(item => item.label)).toEqual(['new-card'])
    expect(test.readDirectory.mock.calls.length).toBeGreaterThan(calls)
    test.service.dispose()
    services.splice(services.indexOf(test.service), 1)
    expect(test.disposeWatcher).toHaveBeenCalledOnce()
  })

  it('reads unsaved candidate snapshots instead of cached disk content', async () => {
    const test = setup('<template><demo-ca| /></template>')
    expect(auto(await test.complete())).toHaveLength(1)
    const candidate = URI.file(path.join(root, 'components/demo-card.mpx'))
    test.language.scripts.set(
      candidate,
      ts.ScriptSnapshot.fromString(
        '<script type="application/json">{ "component": false }</script>',
      ),
      'mpx',
    )
    expect(auto(await test.complete())).toEqual([])
  })

  it('refreshes app globals after an unsaved app configuration change', async () => {
    const test = setup('<template><demo-ca| /></template>', {
      'app.mpx': '<script type="application/json">{}</script>',
    })
    expect(auto(await test.complete())).toHaveLength(1)
    test.language.scripts.set(
      URI.file(path.join(root, 'app.mpx')),
      ts.ScriptSnapshot.fromString(
        '<script type="application/json">{ "usingComponents": { "demo-card": "./components/demo-card" } }</script>',
      ),
      'mpx',
    )
    expect(auto(await test.complete())).toEqual([])
  })

  it('does not reuse an edit after the source document changes', async () => {
    const test = setup('<template><demo-ca| /></template>')
    const item = auto(await test.complete())[0]
    test.update(
      '<template><demo-ca| /></template>\n<script name="json">module.exports = getConfig()</script>',
    )
    const resolved = await test.resolve(item)
    expect(resolved.additionalTextEdits).toBeUndefined()
    expect(resolved.detail).toContain('文档已更改')
  })

  it.each([true, false])(
    'handles a source change while completion resolves (primary edit: %s)',
    async primaryOnly => {
      let resume!: (names: string[]) => void
      let resolving = false
      let called = false
      const waiting = new Promise<string[]>(resolve => {
        resume = resolve
      })
      const test = setup(
        '<template><demo-ca| /></template>',
        {},
        {},
        'page.mpx',
        async () => {
          if (resolving) {
            called = true
            return waiting
          }
          return []
        },
      )
      const item = auto(await test.complete())[0]
      resolving = true
      const pending = test.resolve(item)
      await vi.waitFor(() => expect(called).toBe(true))
      test.update(
        primaryOnly
          ? '<template><demo-card| /></template>'
          : '<template><demo-ca| /></template><!-- unrelated change -->',
      )
      resume([])
      const resolved = await pending
      if (primaryOnly)
        expect(resolved.additionalTextEdits?.length).toBeGreaterThan(0)
      else {
        expect(resolved.additionalTextEdits).toBeUndefined()
        expect(resolved.detail).toContain('文档已更改')
      }
    },
  )

  it('does not resolve a stale Quick Fix into an edit', async () => {
    const test = setup('<template><demo-card| /></template>')
    const position = test.document.positionAt(
      test.document.getText().indexOf('demo-card') + 2,
    )
    const actions = await test.service.getCodeActions(
      test.uri,
      { start: position, end: position },
      { diagnostics: [], only: ['quickfix'] },
    )
    expect(actions).toHaveLength(1)
    expect(actions![0].edit).toBeUndefined()
    test.update(
      '<template><demo-card| /></template><script name="json">module.exports = getConfig()</script>',
    )
    const resolved = await test.service.resolveCodeAction(actions![0])
    expect(resolved.edit).toBeUndefined()
    expect(resolved.disabled?.reason).toContain('文档已更改')
  })

  it('does not register a deleted or changed candidate during resolve', async () => {
    const test = setup('<template><demo-ca| /></template>')
    const item = auto(await test.complete())[0]
    test.files.set(path.join(root, 'components/demo-card.mpx'), undefined)
    test.notify('components/demo-card.mpx', 3)
    const resolved = await test.resolve(item)
    expect(resolved.additionalTextEdits).toBeUndefined()
    expect(resolved.detail).toContain('候选已失效')
  })

  it.each([
    '<template><view title="demo-ca|" /></template>',
    '<template><view>{{ demoCa| }}</view></template>',
    '<template><!-- <demo-ca| --> <view /></template>',
    '<template><demo-card></demo-ca|></template>',
  ])(
    'does not register from attributes, expressions, comments or closing tags: %s',
    async source => {
      expect(auto(await setup(source).complete())).toEqual([])
    },
  )

  it('preserves ordinary HTML completion resolution and source ranges', async () => {
    const test = setup('<template>\n  <vi| />\n</template>')
    const item = (await test.complete()).find(item => item.label === 'view')!
    const resolved = await test.resolve(item)
    expect(apply(test.document, resolved)).toBe(
      '<template>\n  <view />\n</template>',
    )
    expect(resolved.additionalTextEdits).toBeUndefined()
  })

  it('combines workspace candidates with native tag completion at an empty opening tag', async () => {
    const items = await setup('<template><|</template>').complete()
    expect(items.map(item => item.label)).toContain('view')
    expect(auto(items).map(item => item.label)).toContain('demo-card')
  })

  it('scopes candidates to the nearest app and excludes other apps, pages, native names and platform variants', async () => {
    const test = setup(
      '<template><lo| /></template>',
      {
        'app-a/app.mpx': '<script type="application/json">{}</script>',
        'app-a/local-card.mpx': component,
        'app-a/page.mpx': '<script type="application/json">{}</script>',
        'app-a/view.mpx': component,
        'app-a/local-card.ios.mpx': component,
        'app-a/node_modules/dependency.mpx': component,
        'app-a/sub-app/app.mpx': '<script type="application/json">{}</script>',
        'app-a/sub-app/foreign.mpx': component,
        'app-b/app.mpx': '<script type="application/json">{}</script>',
        'app-b/foreign.mpx': component,
      },
      {},
      'app-a/page.mpx',
    )
    expect(auto(await test.complete()).map(item => item.label)).toEqual([
      'local-card',
    ])
  })

  it.each([
    ['local', '<script name="json">module.exports = getConfig()</script>'],
    ['global', ''],
  ])(
    'shows a disabled Quick Fix for unsafe %s configuration without executing it',
    async (kind, config) => {
      const test = setup(
        `<template><demo-card| /></template>${config}`,
        kind === 'global'
          ? {
              'app.mpx':
                '<script name="json">throw new Error("must never run")</script>',
            }
          : {},
      )
      expect(auto(await test.complete())).toEqual([])
      const actions = await test.actions()
      expect(actions).toHaveLength(1)
      expect(actions[0].disabled?.reason).toBeTruthy()
      expect(actions[0].edit).toBeUndefined()
    },
  )
})

describe('safe registration text edits', () => {
  it.each([
    ['json', '{}'],
    ['json', '{ "usingComponents": {} }'],
    ['json', '{ "usingComponents": { /* 保留空对象注释 */ } }'],
    [
      'json',
      '{\n\t"usingComponents": {\n\t\t"existing": "./existing.mpx" // 保留行尾注释\n\t}\n}',
    ],
    ['js', "module.exports = { title: '页面' }"],
    [
      'js',
      "module.exports = { usingComponents: { 'existing': './existing', }, }",
    ],
    [
      'js',
      "module.exports = {\n  // 顶层注释\n  navigationBarTitleText: '页面' // 保留行尾注释\n}",
    ],
  ])('inserts valid entries without rewriting %s: %s', (lang, config) => {
    const source = `<template><view /></template>\n<script ${lang === 'json' ? 'type="application/json"' : 'name="json"'}>\n${config}\n</script>`
    const document = TextDocument.create('file:///page.mpx', 'mpx', 0, source)
    const result = createRegistrationEdit(
      ts,
      document,
      'demo-card',
      "./components/card's.mpx",
    )
    expect(result.reason).toBeUndefined()
    expect(Object.keys(result.edit!.changes!)).toEqual([document.uri])
    const text = TextDocument.applyEdits(document, result.edits)
    const parsed = readComponentConfig(ts, text)
    expect(parsed.reason).toBeUndefined()
    expect(parsed.registrations.get('demo-card')).toBe(
      "./components/card's.mpx",
    )
    // Evaluate only these controlled literal fixtures, independently of the editor parser.
    const sandbox = { module: { exports: {} as Record<string, any> } }
    const actual =
      lang === 'json'
        ? vm.runInNewContext('(' + parsed.block!.content + ')', {})
        : (vm.runInNewContext(parsed.block!.content, sandbox),
          sandbox.module.exports)
    expect(actual.usingComponents['demo-card']).toBe("./components/card's.mpx")
    for (const comment of config.match(/\/\/[^\n]*|\/\*.*?\*\//g) ?? [])
      expect(text).toContain(comment)
  })

  it('preserves CRLF and tab indentation', () => {
    const source =
      '<script type="application/json">\r\n{\r\n\t"usingComponents": {\r\n\t\t"existing": "./existing.mpx",\r\n\t}\r\n}\r\n</script>'
    const document = TextDocument.create('file:///page.mpx', 'mpx', 0, source)
    const result = createRegistrationEdit(
      ts,
      document,
      'demo-card',
      './demo-card.mpx',
    )
    const text = TextDocument.applyEdits(document, result.edits)
    expect(text).toContain('\r\n\t\t"demo-card": "./demo-card.mpx",\r\n')
    expect(text.replaceAll('\r\n', '')).not.toContain('\n')
  })

  it.each([
    '<script name="json">module.exports = getConfig()</script>',
    '<script name="json">const config = {}; module.exports = config</script>',
    '<script name="json">module.exports = { ...shared, usingComponents: {} }</script>',
    '<script name="json">module.exports = { usingComponents: { ...shared } }</script>',
    '<script name="json">module.exports = { usingComponents: require("./components") }</script>',
    '<script name="json">module.exports = { usingComponents: {} }; module.exports.usingComponents = shared</script>',
    '<script name="json">module.exports = { ["usingComponents"]: {} }</script>',
    '<script name="json">module.exports = { get usingComponents() { return {} } }</script>',
    '<script type="application/json">{ "usingComponents": {}, "usingComponents": {} }</script>',
    '<script type="application/json">{ "usingComponents": [] }</script>',
    '<script type="application/json">{ "usingComponents@ios": {} }</script>',
    '<script type="application/json">{ "usingComponents": { "conditional@ios": "./card" } }</script>',
    '<script type="application/json">{ "usingComponents": { "card": 1 } }</script>',
    '<script type="application/json">{ "usingComponents": {</script>',
    '<script type="application/json">{}',
    '<script type="application/json" src="./page.json"></script>',
    '<script name="json" mode="wx">module.exports = {}</script>',
    '<script type="application/json">{}</script><script type="application/json">{}</script>',
  ])('refuses ambiguous or dynamic input: %s', source => {
    const result = createRegistrationEdit(
      ts,
      TextDocument.create('file:///page.mpx', 'mpx', 0, source),
      'demo-card',
      './demo-card.mpx',
    )
    expect(result.edits).toEqual([])
    expect(result.edit).toBeUndefined()
    expect(result.reason).toBeTruthy()
  })
})
