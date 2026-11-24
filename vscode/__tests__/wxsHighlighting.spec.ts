import * as fs from 'node:fs'
import { createRequire } from 'node:module'
import * as path from 'node:path'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { OnigScanner, OnigString, loadWASM } from 'vscode-oniguruma'
import { Registry, parseRawGrammar } from 'vscode-textmate'
import type { IGrammar, IRawGrammar, StateStack } from 'vscode-textmate'

const fromHere = (file: string) => path.resolve(__dirname, file)
const read = (file: string) => fs.readFileSync(fromHere(file), 'utf8')
const contributions = JSON.parse(read('../package.json')).contributes
  .grammars as {
  scopeName: string
  path: string
  injectTo?: string[]
  embeddedLanguages?: Record<string, string>
}[]
const mpx = contributions.find(({ scopeName }) => scopeName === 'source.mpx')!
const languageIds: Record<string, number> = { mpx: 1, html: 2, javascript: 3 }
const wxsScope = 'meta.embedded.block.wxs'

let registry: Registry
let grammar: IGrammar

beforeAll(async () => {
  const require = createRequire(__filename)
  await loadWASM(
    fs.readFileSync(require.resolve('vscode-oniguruma/release/onig.wasm')),
  )
  const external = JSON.parse(
    read('./fixtures/minimap-section-headers/embedded.tmLanguages.json'),
  ) as IRawGrammar[]
  const grammars = new Map(
    external.map(grammar => [grammar.scopeName, grammar]),
  )
  // Supply the attribute rules used by #tag-stuff in the small HTML fixture.
  grammars.get('text.html.basic')!.repository.attribute = {
    patterns: [
      { begin: '"', end: '"', name: 'string.quoted.double.html' },
      { begin: "'", end: "'", name: 'string.quoted.single.html' },
      { match: '[\\w:-]+', name: 'entity.other.attribute-name.html' },
    ],
  }
  const typescript = grammars.get('source.ts')!
  typescript.repository ??= { $self: {}, $base: {} }
  typescript.repository.expression = {
    match: '[\\w$]+',
    name: 'variable.other.readwrite.ts',
  }
  const javascript = fromHere(
    './fixtures/style-directives/JavaScript.tmLanguage.json',
  )
  grammars.set(
    'source.js',
    parseRawGrammar(fs.readFileSync(javascript, 'utf8'), javascript),
  )
  for (const { path: grammarPath, scopeName } of contributions) {
    const filename = fromHere(`../${grammarPath}`)
    grammars.set(
      scopeName,
      parseRawGrammar(fs.readFileSync(filename, 'utf8'), filename),
    )
  }
  registry = new Registry({
    onigLib: Promise.resolve({
      createOnigScanner: patterns => new OnigScanner(patterns),
      createOnigString: text => new OnigString(text),
    }),
    loadGrammar: async scope => grammars.get(scope) ?? null,
    getInjections: scope =>
      contributions
        .filter(contribution => contribution.injectTo?.includes(scope))
        .map(contribution => contribution.scopeName),
  })
  grammar = (await registry.loadGrammarWithConfiguration(
    'source.mpx',
    languageIds.mpx,
    {
      embeddedLanguages: Object.fromEntries(
        Object.entries(mpx.embeddedLanguages!).map(([scope, lang]) => [
          scope,
          languageIds[lang] ?? languageIds.mpx,
        ]),
      ),
    },
  ))!
})

afterAll(() => registry?.dispose())

function tokenize(template: string) {
  let stack: StateStack | null = null
  return `<template>\n${template}\n</template>`.split('\n').map(text => {
    const result = grammar.tokenizeLine(text, stack)
    const { tokens: encoded } = grammar.tokenizeLine2(text, stack)
    stack = result.ruleStack
    return { text, scopes: result.tokens, encoded }
  })
}

function tokenAt(lines: ReturnType<typeof tokenize>, text: string) {
  const line = lines.find(line => line.text.includes(text))!
  const offset = line.text.indexOf(text)
  const token = line.scopes.find(
    token => token.startIndex <= offset && offset < token.endIndex,
  )!
  for (let i = line.encoded.length - 2; i >= 0; i -= 2) {
    if (line.encoded[i] <= offset)
      return { scopes: token.scopes, language: line.encoded[i + 1] & 0xff }
  }
  throw new Error(`Missing token for ${text}`)
}

describe('WXS TextMate embedding', () => {
  it('uses JavaScript only between the inline WXS tags', () => {
    const tokens = tokenize(`  <wxs module="listTool">
    // Filter the rows {{commentText}}
    module.exports.getRenderList = function (rows, limit) {
      return limit < rows.length ? rows.slice(0, limit) : rows
    }
  </wxs>
  <view>{{rows}}</view>`)

    expect(tokenAt(tokens, 'return')).toEqual({
      language: languageIds.javascript,
      scopes: expect.arrayContaining([
        wxsScope,
        'source.js',
        'keyword.control.flow.js',
      ]),
    })
    expect(tokenAt(tokens, 'Filter the rows').scopes).toContain(
      'comment.line.double-slash.js',
    )
    expect(tokenAt(tokens, '{{commentText}}').scopes).not.toContain(
      'expression.embedded.mpx',
    )
    expect(tokenAt(tokens, 'module="').scopes).toContain(
      'entity.other.attribute-name.html',
    )
    expect(tokenAt(tokens, 'module="').language).toBe(languageIds.html)
    expect(tokenAt(tokens, '</wxs>').scopes).not.toContain(wxsScope)
    expect(tokenAt(tokens, '<view>').language).toBe(languageIds.html)
    expect(tokenAt(tokens, '{{rows}}').scopes).toContain(
      'expression.embedded.mpx',
    )
    expect(tokenAt(tokens, '{{rows}}').scopes).not.toContain(wxsScope)
  })

  it('keeps a closing tag and template delimiters inside a JavaScript string', () => {
    const tokens = tokenize(
      '  <view><wxs module="tool">var literal = "</wxs> {{text}}" /* </wxs> */</wxs>{{after}}</view>',
    )

    expect(tokenAt(tokens, '{{text}}').scopes).toContain(
      'string.quoted.double.js',
    )
    expect(tokenAt(tokens, '{{text}}').scopes).not.toContain(
      'expression.embedded.mpx',
    )
    expect(tokenAt(tokens, '{{after}}').scopes).toContain(
      'expression.embedded.mpx',
    )
    expect(tokenAt(tokens, '{{after}}').scopes).not.toContain(wxsScope)
  })

  it.each([
    '<wxs module="tool" src="./format.wxs" />',
    '<wxs\n  module="tool"\n  src="./format.wxs"\n/>',
  ])(
    'keeps self-closing WXS and subsequent template code in HTML (%j)',
    tag => {
      const tokens = tokenize(`  ${tag}<view>{{title}}</view>`)

      expect(tokenAt(tokens, './format.wxs')).toEqual({
        language: languageIds.html,
        scopes: expect.arrayContaining(['string.quoted.double.html']),
      })
      expect(tokenAt(tokens, '/>').scopes).toContain(
        'punctuation.definition.tag.end.html.mpx',
      )
      expect(tokenAt(tokens, '<view>').language).toBe(languageIds.html)
      expect(tokenAt(tokens, '{{title}}').scopes).toContain(
        'expression.embedded.mpx',
      )
      expect(tokenAt(tokens, '{{title}}').scopes).not.toContain(wxsScope)
    },
  )
})
