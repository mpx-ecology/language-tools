import * as fs from 'node:fs'
import { createRequire } from 'node:module'
import * as path from 'node:path'
import * as ts from 'typescript'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { OnigScanner, OnigString, loadWASM } from 'vscode-oniguruma'
import { Registry, parseRawGrammar } from 'vscode-textmate'
import type { IGrammar, IRawGrammar, StateStack } from 'vscode-textmate'

const fromHere = (file: string) => path.resolve(__dirname, file)
const read = (path: string) => fs.readFileSync(fromHere(path), 'utf8')
const manifest = JSON.parse(read('../package.json'))
const contributions = manifest.contributes.grammars as {
  scopeName: string
  path: string
  injectTo?: string[]
  embeddedLanguages?: Record<string, string>
}[]
const mpxContribution = contributions.find(
  grammar => grammar.scopeName === 'source.mpx',
)!
const languageIds: Record<string, number> = {
  mpx: 1,
  plaintext: 2,
  html: 3,
  typescript: 4,
  javascript: 5,
  css: 6,
  stylus: 7,
}
const commentTokenType = 1
const stringTokenType = 2
let registry: Registry
let grammar: IGrammar

beforeAll(async () => {
  const require = createRequire(__filename)
  await loadWASM(
    fs.readFileSync(require.resolve('vscode-oniguruma/release/onig.wasm')),
  )
  // Small, fixed external grammars exercise real TextMate comment/string scopes.
  // Tests must not depend on whichever editor or syntax extensions are installed.
  const externalGrammars = JSON.parse(
    read('./fixtures/minimap-section-headers/embedded.tmLanguages.json'),
  ) as IRawGrammar[]
  const grammars = new Map(
    externalGrammars.map(grammar => [grammar.scopeName, grammar]),
  )
  for (const contribution of contributions) {
    const path = fromHere(`../${contribution.path}`)
    grammars.set(
      contribution.scopeName,
      parseRawGrammar(fs.readFileSync(path, 'utf8'), path),
    )
  }
  registry = new Registry({
    onigLib: Promise.resolve({
      createOnigScanner: patterns => new OnigScanner(patterns),
      createOnigString: value => new OnigString(value),
    }),
    loadGrammar: async scopeName => grammars.get(scopeName) ?? null,
    getInjections: scopeName =>
      contributions
        .filter(contribution => contribution.injectTo?.includes(scopeName))
        .map(contribution => contribution.scopeName),
  })
  grammar = (await registry.loadGrammarWithConfiguration(
    'source.mpx',
    languageIds.mpx,
    {
      embeddedLanguages: Object.fromEntries(
        Object.entries(mpxContribution.embeddedLanguages!).map(
          ([scope, language]) => [scope, languageIds[language] ?? 8],
        ),
      ),
    },
  ))!
})

afterAll(() => registry?.dispose())

describe('minimap MARK section headers (#117)', () => {
  it.each(['\n', '\r\n'])(
    'keeps comment markers at their source positions with %j line endings',
    newline => {
      const lines = tokenize(
        read('./fixtures/minimap-section-headers/marks.mpx').replace(
          /\r?\n/g,
          newline,
        ),
      )
      const expected = [
        [2, 8],
        [4, 8],
        [11, 4],
        [13, 4],
        [16, 4],
        [27, 4],
        [30, 4],
        [34, 4],
      ]
      const actual: number[][] = []
      for (const [lineIndex, line] of lines.entries()) {
        const offset = line.text.indexOf('MARK:')
        if (offset < 0) continue
        const token = tokenAt(line, offset)
        if (token.type !== commentTokenType) continue
        // VS Code before microsoft/vscode#283583 requires both conditions:
        // the MARK token must be a comment AND have the model's root language ID.
        expect(token.languageId, line.text).toBe(languageIds.mpx)
        expect(token.scopes, line.text).toContain('meta.section-header.mpx')
        actual.push([lineIndex + 1, offset + 1])
      }
      expect(actual).toEqual(expected)
    },
  )

  it.each([
    ['script', 'source.js', languageIds.javascript, '//'],
    ['script lang="ts"', 'source.ts', languageIds.typescript, '//'],
    ['style', 'source.css', languageIds.css, '/*'],
    ['style lang="stylus"', 'source.stylus', languageIds.stylus, '//'],
  ])(
    'supports <%s> without changing surrounding tokens',
    (tag, scope, languageId, prefix) => {
      const block = String(tag).split(' ')[0]
      const lines = tokenize(
        `<${tag}>\n${prefix} MARK: Section ${prefix === '/*' ? '*/' : ''}\n${prefix} Ordinary comment ${prefix === '/*' ? '*/' : ''}\n</${block}>`,
      )
      const marker = tokenAt(lines[1], lines[1].text.indexOf('MARK:'))
      expect(marker).toMatchObject({
        languageId: languageIds.mpx,
        type: commentTokenType,
      })
      expect(marker.scopes).toContain(scope)
      expect(tokenAt(lines[1], lines[1].text.indexOf('Section'))).toMatchObject(
        {
          languageId,
          type: commentTokenType,
        },
      )
      expect(
        tokenAt(lines[2], lines[2].text.indexOf('Ordinary')),
      ).toMatchObject({
        languageId,
        type: commentTokenType,
      })
    },
  )

  it('excludes strings, template text and marker-like words', () => {
    const lines = tokenize(read('./fixtures/minimap-section-headers/marks.mpx'))
    for (const text of [
      '属性字符串',
      '脚本字符串',
      '模板字符串',
      '样式字符串',
    ]) {
      const line = lines.find(line => line.text.includes(text))!
      const token = tokenAt(line, line.text.indexOf('MARK:'))
      expect(token.type, text).toBe(stringTokenType)
      expect(token.scopes, text).not.toContain('meta.section-header.mpx')
    }
    const templateText = lines.find(line => line.text.includes('模板文本'))!
    expect(tokenAt(templateText, templateText.text.indexOf('MARK:')).type).toBe(
      0,
    )
    const code = lines.find(line => line.text.includes('const list:'))!
    expect(tokenAt(code, code.text.indexOf('list'))).toMatchObject({
      languageId: languageIds.typescript,
      type: 0,
    })
    const ordinary = tokenize(
      '<script lang="ts">\n// BOOKMARK: ordinary comment\n</script>',
    )[1]
    expect(tokenAt(ordinary, ordinary.text.indexOf('MARK:'))).toMatchObject({
      languageId: languageIds.typescript,
      type: commentTokenType,
    })
    const quoted = tokenize(
      `<script lang="ts">\nconst literal = '// MARK: String'\n</script>`,
    )[1]
    expect(tokenAt(quoted, quoted.text.indexOf('MARK:'))).toMatchObject({
      languageId: languageIds.typescript,
      type: stringTokenType,
    })
  })
})

describe('minimap region section headers (#117)', () => {
  const languageConfiguration = ts.parseConfigFileTextToJson(
    'mpx-language-configuration.json',
    read('../languages/mpx-language-configuration.json'),
  ).config
  const start = new RegExp(languageConfiguration.folding.markers.start)
  const end = new RegExp(languageConfiguration.folding.markers.end)

  it.each([
    ['  <!-- #region Template region -->', '  <!-- #endregion -->'],
    ['// #region Script region', '// #endregion'],
    ['/* #region Style region */', '/* #endregion */'],
  ])('leaves the label available to the editor in %s', (opening, closing) => {
    const match = opening.match(start)!
    expect(match).not.toBeNull()
    // VS Code extracts the title AFTER the matched start marker. Matching the
    // entire comment consumes the label and prevents any minimap decoration.
    expect(opening.slice(match[0].length)).toMatch(/^ \w+ region/)
    expect(start.test(closing)).toBe(false)
    expect(end.test(closing)).toBe(true)
    expect(end.test(opening)).toBe(false)
  })

  it.each([
    'const label = "// #region String"',
    '<view title="<!-- #region Attribute -->" />',
    '/* #regional Not a marker */',
    '// #endregionExtra Not an end marker',
    'MARK: Not a region',
  ])('ignores non-region text: %s', line => {
    expect(start.test(line)).toBe(false)
    expect(end.test(line)).toBe(false)
  })
})

function tokenize(source: string) {
  let stack: StateStack | null = null
  return source.split(/\r?\n/).map(text => {
    const result = grammar.tokenizeLine(text, stack)
    const encoded = grammar.tokenizeLine2(text, stack)
    stack = result.ruleStack
    return { text, tokens: result.tokens, encoded: encoded.tokens }
  })
}

function tokenAt(line: ReturnType<typeof tokenize>[number], offset: number) {
  for (let index = 0; index < line.encoded.length; index += 2) {
    const end = line.encoded[index + 2] ?? Infinity
    if (line.encoded[index] <= offset && offset < end) {
      const metadata = line.encoded[index + 1]
      return {
        languageId: metadata & 0xff,
        type: (metadata >> 8) & 0x3,
        scopes: line.tokens.find(
          token => token.startIndex <= offset && offset < token.endIndex,
        )!.scopes,
      }
    }
  }
  throw new Error(`No token at ${offset} in ${line.text}`)
}
