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
  registry = new Registry({
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
