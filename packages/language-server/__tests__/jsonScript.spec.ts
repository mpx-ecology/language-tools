import * as ts from 'typescript'
import { TextDocument } from 'vscode-languageserver-textdocument'
import { afterEach, describe, expect, it } from 'vitest'
import { evaluateMpxJson } from '../../language-core/__tests__/utils/evaluateMpxJson'
import { createJsonProject } from './utils/createJsonProject'

type Project = Awaited<ReturnType<typeof createJsonProject>>
let project: Project | undefined
const doc = (p: Project, name: string, text = p.read(name)) =>
  TextDocument.create(p.uri(name).toString(), 'mpx', 0, text)
const at = (document: TextDocument, text: string, offset = 1) =>
  document.positionAt(document.getText().indexOf(text) + offset)
const hoverText = (hover: any) => JSON.stringify(hover?.contents ?? '')
afterEach(() => {
  const current = project
  project = undefined
  if (current) {
    const remaining = current.dispose()
    expect(remaining.documentListeners).toBe(0)
    if (current.jsonOnly) expect(remaining.fileListeners).toBe(0)
  }
})

describe.each([true, false])(
  'JSON CommonJS semantics (JSON-only host: %s)',
  jsonOnly => {
    it('provides native CommonJS types, local and cross-file definitions, project settings and signatures', async () => {
      const p = (project = await createJsonProject(jsonOnly))
      const document = doc(p, 'index.mpx')
      const uri = p.uri('index.mpx')
      expect(
        hoverText(
          await p.service.getHover(uri, at(document, 'config.title,', 8)),
        ),
      ).toContain('title: string')
      const definitions = await p.service.getDefinition(
        uri,
        at(document, 'config.title,'),
      )
      expect(definitions).toHaveLength(1)
      expect(definitions![0].targetUri).toBe(uri.toString())
      expect(document.getText(definitions![0].targetSelectionRange)).toBe(
        'config',
      )
      expect(
        document.offsetAt(definitions![0].targetSelectionRange.start),
      ).toBeGreaterThan(document.getText().indexOf('<script name="json">'))
      for (const target of ['./shared']) {
        const links = await p.service.getDefinition(uri, at(document, target))
        expect(links?.map(link => link.targetUri)).toEqual([
          p.uri('shared.js').toString(),
        ])
      }
      const signature = await p.service.getSignatureHelp(
        uri,
        at(document, 'formatTitle(config.title', 'formatTitle('.length),
      )
      expect(signature?.signatures[0].label).toContain('title: string')
      const diagnostics = await p.service.getDiagnostics(uri)
      expect(
        diagnostics.filter(
          d =>
            document.offsetAt(d.range.start) >
              document.getText().indexOf('<script name="json">') &&
            d.severity === 1,
        ),
      ).toEqual([])
      const host = p.service.context.project.typescript!.languageServiceHost
      expect(host.getCompilationSettings().allowJs).toBe(true)
      expect(
        host.getScriptFileNames().some(file => file.endsWith('business.ts')),
      ).toBe(true)
      expect(host.getCompilationSettings().paths).toEqual({
        '@config/*': ['./*'],
      })
      expect(
        host.getScriptFileNames().some(file => file.endsWith('index.mpx')),
      ).toBe(!jsonOnly)
      const businessHover = await p.service.getHover(
        uri,
        at(document, 'runtimeTitle ='),
      )
      if (jsonOnly) expect(businessHover).toBeUndefined()
      else expect(businessHover).toBeTruthy()
    })

    it('maps references, rename and resolved completions exclusively to the JSON block', async () => {
      const p = (project = await createJsonProject(jsonOnly))
      const document = doc(p, 'index.mpx')
      const uri = p.uri('index.mpx')
      const position = at(document, 'config.title,')
      const references = await p.service.getReferences(uri, position, {
        includeDeclaration: true,
      })
      expect(references).toHaveLength(3)
      const edits = await p.service.getRenameEdits(uri, position, 'jsonConfig')
      expect(Object.keys(edits!.changes!)).toEqual([uri.toString()])
      expect(edits!.changes![uri.toString()]).toHaveLength(3)
      for (const edit of edits!.changes![uri.toString()]) {
        expect(document.getText(edit.range)).toBe('config')
        expect(document.offsetAt(edit.range.start)).toBeGreaterThan(
          document.getText().indexOf('<script name="json">'),
        )
      }
      const items = await p.service.getCompletionItems(
        uri,
        at(document, 'config.title,', 'config.'.length),
      )
      const item = items.items.find(item => item.label === 'title')!
      expect(item).toBeTruthy()
      const resolved = await p.service.resolveCompletionItem(item)
      expect(resolved.detail).toContain('string')
      const stringSource = document
        .getText()
        .replace(
          'config.title, config.count',
          'config.title.toUpperCase(), config.count',
        )
      await p.edit('index.mpx', stringSource)
      const updated = doc(p, 'index.mpx', stringSource)
      const strings = await p.service.getCompletionItems(
        uri,
        at(updated, 'title.toUpperCase', 'title.'.length),
      )
      expect(strings.items.some(item => item.label === 'toUpperCase')).toBe(
        true,
      )
    })

    it('checks JSDoc and syntax without leaking business bindings or duplicating diagnostics', async () => {
      const p = (project = await createJsonProject(jsonOnly))
      const document = doc(p, 'errors.mpx')
      const diagnostics = (
        await p.service.getDiagnostics(p.uri('errors.mpx'))
      ).filter(
        d =>
          document.offsetAt(d.range.start) >
          document.getText().indexOf('<script name="json">'),
      )
      for (const code of [2322, 2304, 2339])
        expect(diagnostics.filter(d => d.code === code)).toHaveLength(1)
      expect(diagnostics.find(d => d.code === 2304)?.message).toContain(
        'businessOnly',
      )
      expect(
        (await p.service.getDiagnostics(p.uri('syntax.mpx'))).some(
          d => d.code === 1109,
        ),
      ).toBe(true)
      expect(
        (await p.service.getDiagnostics(p.uri('json-only.mpx'))).filter(
          d => d.severity === 1,
        ),
      ).toEqual([])
    })

    it('refreshes unsaved source and dependencies, disk changes and deleted files', async () => {
      const p = (project = await createJsonProject(jsonOnly))
      const document = doc(p, 'index.mpx')
      const uri = p.uri('index.mpx')
      const position = at(document, 'config.title,', 8)
      expect(hoverText(await p.service.getHover(uri, position))).toContain(
        'string',
      )
      await p.edit('shared.js', 'module.exports = { title: 123, count: 2 }')
      expect(hoverText(await p.service.getHover(uri, position))).toContain(
        'number',
      )
      await p.close('shared.js')
      expect(hoverText(await p.service.getHover(uri, position))).toContain(
        'string',
      )
      await p.write('shared.js', 'module.exports = { title: false, count: 2 }')
      expect(hoverText(await p.service.getHover(uri, position))).toContain(
        'boolean',
      )
      const text =
        '<script name="json">const fresh = { title: 1 }; module.exports = fresh.title</script>'
      await p.edit('new.mpx', text)
      expect(
        hoverText(
          await p.service.getHover(
            p.uri('new.mpx'),
            at(doc(p, 'new.mpx', text), 'fresh.title', 7),
          ),
        ),
      ).toContain('number')
      await p.close('new.mpx')
      expect(
        await p.service.getHover(p.uri('new.mpx'), { line: 0, character: 25 }),
      ).toBeUndefined()
      await p.write('shared.js', undefined)
      const definitions = await p.service.getDefinition(
        uri,
        at(document, './shared'),
      )
      expect(
        definitions?.some(
          link => link.targetUri === p.uri('shared.js').toString(),
        ),
      ).toBe(false)
      expect(
        (await p.service.getDiagnostics(uri)).some(d => d.code === 2307),
      ).toBe(true)
    })
  },
)

it('honors checkJs and @ts-check independently of business script language', async () => {
  const p = (project = await createJsonProject(true, { checkJs: false }))
  expect(
    (await p.service.getDiagnostics(p.uri('unchecked.mpx'))).some(
      d => d.code === 2322,
    ),
  ).toBe(false)
  await p.edit(
    'unchecked.mpx',
    p.read('unchecked.mpx').replace(
      '<script name="json">',
      `<script name="json">
// @ts-check`,
    ),
  )
  expect(
    (await p.service.getDiagnostics(p.uri('unchecked.mpx'))).filter(
      d => d.code === 2322,
    ),
  ).toHaveLength(1)
})

it.each(['', '\n', '\r\n'])(
  'maps JSON JS, JSON links and path diagnostics with prefix %j',
  async prefix => {
    const p = (project = await createJsonProject())
    for (const [tag, body] of [
      [
        '<script name="json">',
        "const config = { title: '中文' }; module.exports = { navigationBarTitleText: config.title, usingComponents: { panel: './panel.mpx', missing: './missing.mpx' }, pages: ['./panel.mpx'] }",
      ],
      [
        '<script type="application/json">',
        '{ "usingComponents": { "panel": "./panel.mpx", "missing": "./missing.mpx" }, "pages": ["./panel.mpx"] }',
      ],
    ]) {
      const source = tag + prefix + body + '</script>'
      await p.edit('index.mpx', source)
      const document = doc(p, 'index.mpx', source)
      const uri = p.uri('index.mpx')
      const links = await p.service.getDocumentLinks(uri)
      expect(
        links.filter(link => document.getText(link.range) === './panel.mpx'),
      ).toHaveLength(2)
      const errors = (await p.service.getDiagnostics(uri)).filter(
        d => d.source === 'mpx-json',
      )
      expect(errors).toHaveLength(1)
      expect(document.getText(errors[0].range)).toBe('./missing.mpx')
      if (tag.includes('name=')) {
        const definitions = await p.service.getDefinition(
          uri,
          at(document, 'config.title'),
        )
        expect(document.getText(definitions![0].targetSelectionRange)).toBe(
          'config',
        )
        expect(
          document.offsetAt(definitions![0].targetSelectionRange.start),
        ).toBe(source.indexOf('config ='))
      }
    }
  },
)

it('keeps default tsserver registration free of extra service scripts', async () => {
  const { createMpxLanguagePlugin, getDefaultCompilerOptions } = await import(
    '@mpxjs/language-core'
  )
  const plugin = createMpxLanguagePlugin(
    ts,
    {},
    getDefaultCompilerOptions(),
    (id: string) => id,
  )
  expect(plugin.typescript!.getExtraServiceScripts).toBeUndefined()
})

it('resolves CommonJS auto-import completion edits inside the JSON block', async () => {
  const p = (project = await createJsonProject(true, { allowJs: true }))
  const document = doc(p, 'auto-import.mpx')
  const uri = p.uri('auto-import.mpx')
  const items = await p.service.getCompletionItems(
    uri,
    at(document, 'jsonTitleFactory()', 'jsonTitle'.length),
  )
  const item = items.items.find(item => item.label === 'jsonTitleFactory')
  expect(item).toBeTruthy()
  const resolved = await p.service.resolveCompletionItem(item!)
  expect(resolved.additionalTextEdits?.length).toBeGreaterThan(0)
  for (const edit of resolved.additionalTextEdits!) {
    expect(edit.newText).toContain('require(')
    expect(document.offsetAt(edit.range.start)).toBeGreaterThanOrEqual(
      document.getText().indexOf('<script name="json">') +
        '<script name="json">'.length,
    )
  }
})

it('supports an inferred project without a tsconfig', async () => {
  const p = (project = await createJsonProject(true, {}, false))
  const document = doc(p, 'index.mpx')
  const uri = p.uri('index.mpx')
  p.project.tryAddFile(uri.fsPath)
  expect(
    hoverText(await p.service.getHover(uri, at(document, 'config.title,', 8))),
  ).toContain('title: string')
  expect(
    (await p.service.getDefinition(uri, at(document, './shared')))?.some(
      link => link.targetUri === p.uri('shared.js').toString(),
    ),
  ).toBe(true)
})

it('evaluates positive fixtures with the published Mpx JSON compiler', async () => {
  const p = (project = await createJsonProject())
  expect(
    evaluateMpxJson(p.read('index.mpx'), p.uri('index.mpx').fsPath),
  ).toEqual({
    navigationBarTitleText: '共享配置2',
    usingComponents: { panel: './panel.mpx' },
    customBuildFlag: true,
  })
  expect(
    evaluateMpxJson(p.read('json-only.mpx'), p.uri('json-only.mpx').fsPath),
  ).toEqual({ navigationBarTitleText: 'json only' })
})

for (const jsonOnly of [true, false]) {
  it.each([
    [
      'TypeScript setup',
      '<script setup lang="ts">const runtimeTitle = "runtime"; defineExpose({ runtimeTitle })</script>',
    ],
    [
      'JavaScript setup',
      '<script setup>const runtimeTitle = "runtime"; defineExpose({ runtimeTitle })</script>',
    ],
    [
      'JavaScript options',
      '<script>import { createComponent } from "@mpxjs/core"; createComponent({ data: { runtimeTitle: "runtime" } })</script>',
    ],
    ['JSON only', ''],
  ])(
    'keeps JSON semantics independent of %s (JSON-only host: ' + jsonOnly + ')',
    async (_, script) => {
      const p = (project = await createJsonProject(jsonOnly))
      const json =
        '<script name="json">\nconst shared = require("./shared")\nconst config = { title: shared.title }\n/** @type {number} */\nconst count = "wrong"\nmodule.exports = { navigationBarTitleText: config.title, count }\n</script>'
      const source = script + '\n' + json
      await p.edit('index.mpx', source)
      const document = doc(p, 'index.mpx', source)
      const uri = p.uri('index.mpx')
      expect(
        hoverText(
          await p.service.getHover(uri, at(document, 'config.title', 8)),
        ),
      ).toContain('title: string')
      const definitions = await p.service.getDefinition(
        uri,
        at(document, 'config.title'),
      )
      expect(
        definitions?.map(definition =>
          document.getText(definition.targetSelectionRange),
        ),
      ).toEqual(['config'])
      expect(
        (await p.service.getDiagnostics(uri)).filter(d => d.code === 2322),
      ).toHaveLength(1)
    },
  )
}

it.each([true, false])(
  'keeps diagnostics and navigation after removing and restoring lang="ts" in a warm project (JSON-only host: %s)',
  async jsonOnly => {
    const p = (project = await createJsonProject(jsonOnly))
    const name = 'errors.mpx'
    const original = p.read(name)
    const uri = p.uri(name)
    await p.edit(name, original)
    for (const source of [
      original,
      original.replace(' lang="ts"', ''),
      original,
    ]) {
      await p.edit(name, source)
      const document = doc(p, name, source)
      const diagnostics = (await p.service.getDiagnostics(uri)).filter(
        d =>
          document.offsetAt(d.range.start) >
          source.indexOf('<script name="json">'),
      )
      for (const code of [2322, 2304, 2339])
        expect(diagnostics.filter(d => d.code === code)).toHaveLength(1)
      const definitions = await p.service.getDefinition(
        uri,
        at(document, 'invalidTitle.missing'),
      )
      expect(definitions).toHaveLength(1)
      expect(document.getText(definitions![0].targetSelectionRange)).toBe(
        'invalidTitle',
      )
    }
  },
)
