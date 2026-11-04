import * as ts from 'typescript'
import { describe, expect, it } from 'vitest'
import {
  createLanguage,
  createLanguageService,
  createUriMap,
} from '@volar/language-service'
import {
  createMpxLanguagePlugin,
  getDefaultCompilerOptions,
} from '@mpxjs/language-core'
import type { TextEdit } from 'vscode-languageserver-protocol'
import { TextDocument } from 'vscode-languageserver-textdocument'
import { URI } from 'vscode-uri'
import { createMpxLanguageServicePlugins } from '../src'

function setup(
  content: string,
  newline = '\n',
  tag = 'name="json"',
  withSchema = true,
) {
  const marked = `<script ${tag}>${newline}${content}${newline}</script>`
  const offset = marked.indexOf('|')
  const text = marked.replace('|', '')
  const uri = URI.file('/json-config.mpx')
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
  language.scripts.set(uri, ts.ScriptSnapshot.fromString(text), 'mpx')
  const service = createLanguageService(
    language,
    createMpxLanguageServicePlugins(ts, undefined).filter(
      plugin => withSchema || plugin.name !== 'mpx-json-config',
    ),
    { workspaceFolders: [] },
    {},
  )
  const document = TextDocument.create(uri.toString(), 'mpx', 0, text)
  return { service, document, uri, position: document.positionAt(offset) }
}

describe('dynamic JSON config schema guidance', () => {
  it('reproduces the missing schema guidance with only the #142 providers', async () => {
    const p = setup(
      "module.exports = { component: 'bad', nav| }",
      '\n',
      'name="json"',
      false,
    )
    try {
      expect(
        (await p.service.getCompletionItems(p.uri, p.position)).items.some(
          item => item.label === 'navigationBarTitleText' && item.documentation,
        ),
      ).toBe(false)
      expect(
        await p.service.getHover(
          p.uri,
          p.document.positionAt(p.document.getText().indexOf('component:') + 1),
        ),
      ).toBeUndefined()
      expect(
        (await p.service.getDiagnostics(p.uri)).filter(
          d => d.source === 'mpx-json-schema',
        ),
      ).toEqual([])
    } finally {
      p.service.dispose()
    }
  })

  it('offers fields in an unfinished object at the end of an inline block', async () => {
    const p = setup('module.exports = { |', '')
    try {
      expect(
        (await p.service.getCompletionItems(p.uri, p.position)).items.map(
          item => item.label,
        ),
      ).toContain('component')
    } finally {
      p.service.dispose()
    }
  })

  it.each(['\n', '\r\n', ''])(
    'maps field completions in %j scripts',
    async newline => {
      const p = setup('module.exports = { nav| }', newline)
      try {
        const items = (await p.service.getCompletionItems(p.uri, p.position))
          .items
        const item = items.find(i => i.label === 'navigationBarTitleText')!
        expect(item).toBeDefined()
        expect(item.documentation).toBeTruthy()
        expect(
          TextDocument.applyEdits(p.document, [item.textEdit as TextEdit]),
        ).toBe(p.document.getText().replace('nav', 'navigationBarTitleText: '))
      } finally {
        p.service.dispose()
      }
    },
  )

  it.each([
    'module.exports = { | }',
    'const config = { | }; module.exports = config',
    'module.exports = flag ? { | } : { component: false }',
    'module.exports = flag ? { component: false } : { | }',
  ])('completes safely identified export objects: %s', async text => {
    const p = setup(text)
    try {
      const items = (await p.service.getCompletionItems(p.uri, p.position))
        .items
      expect(items.map(i => i.label)).toContain('component')
    } finally {
      p.service.dispose()
    }
  })

  it.each([
    ["module.exports = { navigationBarTextStyle: 'bl|' }", '"black"'],
    ['module.exports = { component: | }', 'true'],
    ['module.exports = { component: | }', 'false'],
  ])('replaces a static value with %s / %s', async (text, label) => {
    const p = setup(text)
    try {
      const items = (await p.service.getCompletionItems(p.uri, p.position))
        .items
      const item = items.find(i => i.label === label)!
      expect(item).toBeDefined()
      const changed = TextDocument.applyEdits(p.document, [
        item.textEdit as TextEdit,
      ])
      expect(changed).toContain(`: ${label} }`)
    } finally {
      p.service.dispose()
    }
  })

  it('reuses field docs and diagnoses only known static values once', async () => {
    const p = setup(
      "const config = { component: 'yes', navigationBarTextStyle: 'blue', navigationBarTitleText: 42, usingComponents: [], extensionOption: 42 }; module.exports = config",
    )
    try {
      const hover = await p.service.getHover(
        p.uri,
        p.document.positionAt(p.document.getText().indexOf('component:') + 2),
      )
      expect(JSON.stringify(hover?.contents)).toContain('自定义组件声明')
      const diagnostics = (await p.service.getDiagnostics(p.uri)).filter(
        d => d.source === 'mpx-json-schema',
      )
      expect(
        diagnostics
          .sort(
            (a, b) =>
              p.document.offsetAt(a.range.start) -
              p.document.offsetAt(b.range.start),
          )
          .map(d => p.document.getText(d.range)),
      ).toEqual(["'yes'", "'blue'", '42', '[]'])
    } finally {
      p.service.dispose()
    }
  })

  it.each([
    'const ordinary = { | }; module.exports = {}',
    'module.exports = build({ | })',
    'function configure() { module.exports = { | } }',
    'const module = {}; module.exports = { | }',
    'import module from "some-module"; module.exports = { | }',
    'if (flag) { var module }; module.exports = { | }',
    'const { value: module } = other; module.exports = { | }',
    'module = other; module.exports = { | }',
    'module.exports = { usingComponents: { | } }',
    'module.exports = { /* | */ }',
    'module.exports = { component: /* | */ true }',
    'module.exports = { navigationBarTitleText: read(|) }',
  ])('does not inject config suggestions in unrelated JS: %s', async text => {
    const p = setup(text)
    try {
      const items = (await p.service.getCompletionItems(p.uri, p.position))
        .items
      expect(items.map(i => i.label)).not.toContain('component')
    } finally {
      p.service.dispose()
    }
  })

  it.each([
    'module.exports = { component: false, platformOnly: 42 }',
    'module.exports = { constructor: 42, toString: 42, __proto__: 42 }',
    'module.exports = { component: compute(), navigationBarTitleText: title }',
    "module.exports = { navigationBarTextStyle: 'bad', ...shared }",
    "module.exports = { navigationBarTextStyle: 'bad', navigationBarTextStyle: 'white' }",
    "module.exports = { navigationBarTextStyle: 'bad', [key]: value }",
    "const config = { component: 'bad' }; config.component = true; module.exports = config",
    "const config = { component: 'bad' }; change(config); module.exports = config",
    "const config = { component: 'bad' }; module.exports = clone(config)",
  ])('does not guess dynamic or overridden values: %s', async text => {
    const p = setup(text)
    try {
      expect(
        (await p.service.getDiagnostics(p.uri)).filter(
          d => d.source === 'mpx-json-schema',
        ),
      ).toEqual([])
    } finally {
      p.service.dispose()
    }
  })

  it.each([
    "module.exports = { component: 'bad' }; module.exports = { component: true }",
    "module.exports = { component: 'bad' }; module.exports.component = true",
    "module.exports = { component: 'bad' }; module['exports']['component'] = true",
    "module.exports = { component: 'bad' }; module.exports = build()",
    "module.exports = { component: 'bad' }; delete module.exports.component",
    "module.exports = { component: 'bad' }; module.exports[key] = value",
    "module.exports = { component: 'bad' }; if (flag) module.exports.component = true",
    "module.exports = { component: 'bad' }; change(module.exports)",
    "module.exports = { component: 'bad' }; const alias = module.exports; module.exports.component = 'bad'; alias.component = true",
    "module.exports = { component: 'bad' }; function rewrite() { module.exports.component = true }; rewrite()",
  ])('does not diagnose superseded or uncertain exports: %s', async text => {
    const p = setup(text)
    try {
      expect(
        (await p.service.getDiagnostics(p.uri)).filter(
          d => d.source === 'mpx-json-schema',
        ),
      ).toEqual([])
    } finally {
      p.service.dispose()
    }
  })

  it.each([
    [
      "module.exports = { component: true }; module.exports = { component: 'last' }",
      "'last'",
    ],
    [
      "module.exports = { component: true }; module.exports.component = 'last'",
      "'last'",
    ],
    [
      "module['exports'] = { component: true }; module['exports']['component'] = 'last'",
      "'last'",
    ],
    [
      "module.exports = flag ? { component: true } : { component: false }; module.exports.component = 'last'",
      "'last'",
    ],
    [
      "module.exports = { component: 'kept' }; module.exports.navigationBarTitleText = 'valid'",
      "'kept'",
    ],
    [
      "module.exports = { component: true }; module.exports[key] = value; module.exports.component = 'last'",
      "'last'",
    ],
    [
      "module.exports = { component: true }; change(module.exports); module.exports = { component: 'fresh' }",
      "'fresh'",
    ],
  ])(
    'diagnoses the final reliable write at its source range: %s',
    async (text, expected) => {
      const p = setup(text)
      try {
        const diagnostics = (await p.service.getDiagnostics(p.uri)).filter(
          d => d.source === 'mpx-json-schema',
        )
        expect(diagnostics).toHaveLength(1)
        expect(diagnostics[0]).toMatchObject({ code: 4002, severity: 2 })
        expect(p.document.getText(diagnostics[0].range)).toBe(expected)
      } finally {
        p.service.dispose()
      }
    },
  )

  it('retains completion and hover in an overwritten configuration object', async () => {
    const p = setup(
      "module.exports = { component: 'bad', nav| }; module.exports = { component: true }",
    )
    try {
      expect(
        (await p.service.getCompletionItems(p.uri, p.position)).items.map(
          item => item.label,
        ),
      ).toContain('navigationBarTitleText')
      const hover = await p.service.getHover(
        p.uri,
        p.document.positionAt(p.document.getText().indexOf('component') + 1),
      )
      expect(JSON.stringify(hover?.contents)).toContain('自定义组件声明')
    } finally {
      p.service.dispose()
    }
  })
})
