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
}[]
let registry: Registry
let grammar: IGrammar

beforeAll(async () => {
  const require = createRequire(__filename)
  await loadWASM(
    fs.readFileSync(require.resolve('vscode-oniguruma/release/onig.wasm')),
  )
  // Fixed dependency grammars keep this test independent of installed editors.
  const external = JSON.parse(
    read('./fixtures/minimap-section-headers/embedded.tmLanguages.json'),
  ) as IRawGrammar[]
  const grammars = new Map(
    external.map(grammar => [grammar.scopeName, grammar]),
  )
  for (const scopeName of [
    'source.css.scss',
    'source.css.less',
    'source.sass',
  ]) {
    grammars.set(scopeName, {
      scopeName,
      patterns: [{ include: 'source.css' }],
    } as IRawGrammar)
  }
  for (const contribution of contributions) {
    const filename = fromHere(`../${contribution.path}`)
    grammars.set(
      contribution.scopeName,
      parseRawGrammar(fs.readFileSync(filename, 'utf8'), filename),
    )
  }
  const javascript = fromHere(
    './fixtures/style-directives/JavaScript.tmLanguage.json',
  )
  grammars.set(
    'source.js',
    parseRawGrammar(fs.readFileSync(javascript, 'utf8'), javascript),
  )
  registry = new Registry({
    theme: {
      settings: [
        { settings: { foreground: '#D4D4D4' } },
        { scope: 'comment', settings: { foreground: '#6A9955' } },
        { scope: 'meta.embedded', settings: { foreground: '#D4D4D4' } },
        { scope: 'variable', settings: { foreground: '#9CDCFE' } },
        { scope: 'string', settings: { foreground: '#CE9178' } },
      ],
    },
    onigLib: Promise.resolve({
      createOnigScanner: patterns => new OnigScanner(patterns),
      createOnigString: value => new OnigString(value),
    }),
    loadGrammar: async scopeName => grammars.get(scopeName) ?? null,
    getInjections: scopeName =>
      contributions
        .filter(grammar => grammar.injectTo?.includes(scopeName))
        .map(grammar => grammar.scopeName),
  })
  grammar = (await registry.loadGrammar('source.mpx'))!
})

afterAll(() => registry?.dispose())

function tokenize(source: string) {
  let stack: StateStack | null = null
  return source.split(/\r?\n/).map(text => {
    const tokens = grammar.tokenizeLine(text, stack)
    const encoded = grammar.tokenizeLine2(text, stack)
    stack = tokens.ruleStack
    return { text, tokens: tokens.tokens, encoded: encoded.tokens }
  })
}

function tokenAt(line: ReturnType<typeof tokenize>[number], text: string) {
  const offset = line.text.indexOf(text)
  expect(offset).toBeGreaterThanOrEqual(0)
  return line.tokens.find(
    token => token.startIndex <= offset && offset < token.endIndex,
  )!
}

describe('style conditional directive highlighting', () => {
  it('resets the inherited comment token type and theme inside the condition', () => {
    const lines = tokenize(
      "<style>\n/* @mpx-if (__mpx_mode__ === 'wx') */\n</style>",
    )
    const metadataAt = (text: string) => {
      const offset = lines[1].text.indexOf(text)
      const tokens = lines[1].encoded
      for (let i = tokens.length - 2; i >= 0; i -= 2)
        if (tokens[i] <= offset) return tokens[i + 1]
      throw new Error('Missing token')
    }
    const foreground = (text: string) =>
      registry.getColorMap()[(metadataAt(text) >>> 15) & 0x1ff]
    expect((metadataAt('__mpx_mode__') >>> 8) & 3).toBe(0)
    expect((metadataAt("'wx'") >>> 8) & 3).toBe(2)
    expect((metadataAt('*/') >>> 8) & 3).toBe(1)
    expect(foreground('__mpx_mode__')).toBe('#9CDCFE')
    expect(foreground("'wx'")).toBe('#CE9178')
    expect(foreground('*/')).toBe('#6A9955')
  })

  it.each([
    "(__mpx_mode__ === 'wx')",
    "((__mpx_mode__ === 'wx'",
    "(__mpx_mode__ === 'wx",
  ])('bounds Stylus line-comment expression %s at the newline', expression => {
    const lines = tokenize(
      `<style lang="stylus">\n// @mpx-if ${expression}\n.x\n  color red\n// @mpx-endif\n</style>`,
    )
    expect(tokenAt(lines[1], '__mpx_mode__').scopes).toContain(
      'variable.other.readwrite.js',
    )
    expect(tokenAt(lines[3], 'color').scopes).not.toContain('source.js')
  })

  it('preserves parentheses in regular expressions and escaped strings', () => {
    const lines = tokenize(
      `<style>\n/* @mpx-if (/(wx|ali)/.test(__mpx_mode__) && __mpx_mode__ !== 'w\\\'x)') */\n.x { color: red; }\n</style>`,
    )
    expect(tokenAt(lines[1], 'wx|ali').scopes).toContain('string.regexp.js')
    expect(tokenAt(lines[1], '__mpx_mode__').scopes).toContain(
      'variable.other.readwrite.js',
    )
    expect(tokenAt(lines[1], "w\\'x)").scopes).toContain(
      'string.quoted.single.js',
    )
    expect(tokenAt(lines[2], 'color').scopes).not.toContain('source.js')
  })

  it('does not create minimap headings inside condition strings', () => {
    const lines = tokenize(
      '<style>\n/* @mpx-if (__mpx_mode__ === "MARK: platform") */\n</style>',
    )
    expect(tokenAt(lines[1], 'MARK:').scopes).toContain(
      'string.quoted.double.js',
    )
    expect(tokenAt(lines[1], 'MARK:').scopes).not.toContain(
      'meta.section-header.mpx',
    )
  })

  it.each([
    'style',
    'style lang="scss"',
    'style lang="less"',
    'style lang="postcss"',
    'style lang="stylus"',
  ])('uses JavaScript scopes inside <%s> conditions', tag => {
    const lines = tokenize(
      `<${tag}>\n/* @mpx-if (__mpx_mode__ === 'wx' && true && version >= 2) */\n/* @mpx-elif (__mpx_mode__ === 'ali') */\n</style>`,
    )
    expect(tokenAt(lines[1], '__mpx_mode__').scopes).toContain(
      'variable.other.readwrite.js',
    )
    expect(tokenAt(lines[1], "'wx'").scopes).toContain(
      'string.quoted.single.js',
    )
    expect(tokenAt(lines[1], '===').scopes).toContain(
      'keyword.operator.comparison.js',
    )
    expect(tokenAt(lines[1], 'true').scopes).toContain(
      'constant.language.boolean.true.js',
    )
    expect(tokenAt(lines[1], '2').scopes).toContain(
      'constant.numeric.decimal.js',
    )
    expect(tokenAt(lines[2], '__mpx_mode__').scopes).toContain(
      'variable.other.readwrite.js',
    )
    expect(tokenAt(lines[1], '*/').scopes).not.toContain(
      'meta.embedded.block.mpx-style-condition',
    )
  })

  it('handles multiline expressions, nested parentheses and quoted parentheses', () => {
    const lines = tokenize(
      `<style>\n/* @mpx-if (\n  (__mpx_mode__ === 'wx)') ||\n  (__mpx_mode__ === "ali(" && true)\n) ordinary explanation */\n.x { color: red; }\n</style>`,
    )
    for (const index of [2, 3]) {
      expect(tokenAt(lines[index], '__mpx_mode__').scopes).toContain(
        'variable.other.readwrite.js',
      )
    }
    expect(tokenAt(lines[2], "'wx)'").scopes).toContain(
      'string.quoted.single.js',
    )
    expect(tokenAt(lines[4], 'ordinary').scopes).not.toContain('source.js')
    expect(tokenAt(lines[5], 'color').scopes).not.toContain('source.js')
  })

  it.each([
    "(__mpx_mode__ === 'wx' &&",
    "((__mpx_mode__ === 'wx' &&",
    "(__mpx_mode__ === 'wx",
    '(__mpx_mode__ === "wx',
    '(__mpx_mode__ === `wx',
  ])(
    'does not escape a block comment with unfinished condition %s',
    expression => {
      const lines = tokenize(
        `<style>\n/* @mpx-if ${expression} */ .x { color: red; }\n.y { color: blue; }\n</style>\n<script>\nconst value = 1\n</script>`,
      )
      expect(
        tokenAt(lines[1], '*/').scopes.some(scope =>
          scope.startsWith('string.'),
        ),
      ).toBe(false)
      for (const index of [1, 2]) {
        expect(tokenAt(lines[index], 'color').scopes).not.toContain('source.js')
        expect(
          tokenAt(lines[index], 'color').scopes.some(scope =>
            scope.startsWith('comment.'),
          ),
        ).toBe(false)
      }
      expect(tokenAt(lines[5], 'value').scopes).not.toContain(
        'meta.embedded.block.mpx-style-condition',
      )
    },
  )

  it('keeps directive-like strings and normal comment text out of expressions', () => {
    const lines = tokenize(
      `<style>\n/* @mpx-if (__mpx_mode__ === '@mpx-if (false)') */\n/* ordinary (__mpx_mode__ === 'wx') */\n/* @mpx-else (__mpx_mode__) */\n</style>`,
    )
    expect(tokenAt(lines[1], 'false').scopes).toContain(
      'string.quoted.single.js',
    )
    expect(tokenAt(lines[1], 'false').scopes).not.toContain(
      'keyword.control.directive.mpx',
    )
    for (const index of [2, 3])
      expect(tokenAt(lines[index], '__mpx_mode__').scopes).not.toContain(
        'source.js',
      )
  })

  it('keeps PostCSS directives and string boundaries without a PostCSS grammar extension', () => {
    // No source.postcss dependency is registered above: a default VS Code
    // installation still provides the CSS grammar used by this fallback.
    const lines = tokenize(
      '<style lang="postcss">\n/* @mpx-if (__mpx_mode__) */\n.x { content: "@mpx-if"; color: red; }\n/* @mpx-endif */\n</style>',
    )
    expect(tokenAt(lines[1], '@mpx-if').scopes).toContain(
      'keyword.control.directive.mpx',
    )
    expect(tokenAt(lines[2], '@mpx-if').scopes).not.toContain(
      'keyword.control.directive.mpx',
    )
    expect(
      tokenAt(lines[2], '@mpx-if').scopes.some(scope =>
        scope.startsWith('string.'),
      ),
    ).toBe(true)
  })

  it.each([
    'style',
    'style lang="css"',
    'style lang="scss"',
    'style lang="less"',
    'style lang="postcss"',
    'style lang="sass"',
    'style lang="stylus"',
  ])(
    'highlights directive keywords within <%s> without changing comment boundaries',
    tag => {
      const lines = tokenize(
        `<${tag}>\n/* @mpx-if (__mpx_mode__) */\n/* @mpx-elif (__mpx_mode__) */\n/* @mpx-else */\n/* @mpx-endif */\n.x { color: red; }\n</style>`,
      )
      for (const [index, directive] of [
        'if',
        'elif',
        'else',
        'endif',
      ].entries()) {
        const token = tokenAt(lines[index + 1], `@mpx-${directive}`)
        expect(token.scopes, tag).toContain('keyword.control.directive.mpx')
        expect(
          token.scopes.some(scope => scope.startsWith('comment.')),
          tag,
        ).toBe(true)
      }
      expect(tokenAt(lines[1], '__mpx_mode__').scopes).not.toContain(
        'keyword.control.directive.mpx',
      )
      expect(
        tokenAt(lines[5], 'color').scopes.some(scope =>
          scope.startsWith('comment.'),
        ),
      ).toBe(false)
    },
  )

  it.each([
    '/* ordinary prose @mpx-if */',
    '/* ordinary /* @mpx-if */',
    '/* @mpx-ifdef */',
    '/* @mpx-else-if */',
    '.x { content: "/* @mpx-if */"; }',
    ".x { content: '/* @mpx-if */'; }",
  ])('does not mark unrelated stylesheet text: %s', line => {
    const tokens = tokenize(`<style>\n${line}\n</style>`)
    expect(tokenAt(tokens[1], '@mpx-').scopes).not.toContain(
      'keyword.control.directive.mpx',
    )
  })

  it('does not apply style directives to script or template comments', () => {
    const lines = tokenize(
      '<template>\n<!-- @mpx-if -->\n</template>\n<script>\n/* @mpx-if */\n</script>',
    )
    expect(tokenAt(lines[1], '@mpx-if').scopes).not.toContain(
      'keyword.control.directive.mpx',
    )
    expect(tokenAt(lines[4], '@mpx-if').scopes).not.toContain(
      'keyword.control.directive.mpx',
    )
  })

  it('keeps minimap MARK tokens in neighboring comments', () => {
    const lines = tokenize(
      '<style>\n/* @mpx-if (__mpx_mode__) */\n/* MARK: Section */\n/* @mpx-endif */\n</style>',
    )
    expect(tokenAt(lines[2], 'MARK:').scopes).toContain(
      'meta.section-header.mpx',
    )
  })

  it('highlights a directive at the beginning of a multiline comment', () => {
    const lines = tokenize(
      '<style>\n/*\n  @mpx-if (\n    __mpx_mode__\n  )\n*/\n</style>',
    )
    expect(tokenAt(lines[2], '@mpx-if').scopes).toContain(
      'keyword.control.directive.mpx',
    )
    expect(tokenAt(lines[3], '__mpx_mode__').scopes).not.toContain(
      'keyword.control.directive.mpx',
    )
  })

  it('supports Stylus line comments without affecting strings', () => {
    const lines = tokenize(
      '<style lang="stylus">\n// @mpx-if (__mpx_mode__)\n.x\n  content "// @mpx-if"\n</style>',
    )
    expect(tokenAt(lines[1], '@mpx-if').scopes).toContain(
      'keyword.control.directive.mpx',
    )
    expect(tokenAt(lines[3], '@mpx-if').scopes).not.toContain(
      'keyword.control.directive.mpx',
    )
  })
})
