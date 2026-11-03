import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { OnigScanner, OnigString, loadWASM } from 'vscode-oniguruma'
import {
  type IGrammar,
  type IRawGrammar,
  Registry,
  type StateStack,
  parseRawGrammar,
} from 'vscode-textmate'

let registry: Registry
let grammar: IGrammar
beforeAll(async () => {
  const require = createRequire(__filename)
  await loadWASM(
    fs.readFileSync(require.resolve('vscode-oniguruma/release/onig.wasm')),
  )
  const contributions = JSON.parse(
    fs.readFileSync(path.join(__dirname, '../package.json'), 'utf8'),
  ).contributes.grammars as {
    scopeName: string
    path: string
    injectTo?: string[]
  }[]
  const grammars = new Map<string, IRawGrammar>()
  // A small HTML host exercises injection priority, attribute boundaries and
  // strings independently of the user's installed editor or theme.
  grammars.set('text.html.basic', {
    scopeName: 'text.html.basic',
    patterns: [
      { begin: '<!--', end: '-->', name: 'comment.block.html' },
      {
        begin: '<[a-zA-Z][\\w:-]*',
        end: '/?>',
        name: 'meta.tag.html',
        patterns: [
          {
            begin: '[\\w:@|()-]+\\s*=\\s*"',
            end: '"',
            name: 'meta.attribute.html string.quoted.double.html',
          },
          {
            begin: "[\\w:@|()-]+\\s*=\\s*'",
            end: "'",
            name: 'meta.attribute.html string.quoted.single.html',
          },
        ],
      },
    ],
    repository: {
      comment: { begin: '<!--', end: '-->', name: 'comment.block.html' },
    },
  } as unknown as IRawGrammar)
  grammars.set('text.html.derivative', {
    scopeName: 'text.html.derivative',
    patterns: [{ include: 'text.html.basic' }],
  } as unknown as IRawGrammar)
  for (const contribution of contributions) {
    const filename = path.join(__dirname, '..', contribution.path)
    grammars.set(
      contribution.scopeName,
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
        .filter(c => c.injectTo?.includes(scope))
        .map(c => c.scopeName),
  })
  grammar = (await registry.loadGrammar('source.mpx'))!
})
afterAll(() => registry?.dispose())

function scopes(source: string, needle: string) {
  let stack: StateStack | null = null
  for (const line of `<template>\n${source}\n</template>`.split('\n')) {
    const result = grammar.tokenizeLine(line, stack)
    stack = result.ruleStack
    const offset = line.indexOf(needle)
    if (offset >= 0)
      return result.tokens.find(
        token => token.startIndex <= offset && offset < token.endIndex,
      )!.scopes
  }
  throw new Error('Missing test token')
}

describe('mpxTagName lexical tag scopes', () => {
  it.each([
    '<view mpxTagName="tag-panel"></view>',
    "<view mpxTagName='tag-panel'></view>",
    '<view mpxTagName=tag-panel />',
    '<view mpxTagName@ios|android="tag-panel" />',
    '<view mpxTagName@(swan|ali)="tag-panel" />',
    '<view mpxTagName@:demo="tag-panel" />',
    '<view mpxTagName@_ios:demo="tag-panel" />',
  ])('marks only a complete static value as a tag: %s', source => {
    expect(scopes(source, 'tag-panel')).toContain('entity.name.tag.html.mpx')
    expect(scopes(source, 'mpxTagName')).not.toContain(
      'entity.name.tag.html.mpx',
    )
  })
  it.each([
    '<view title="tag-panel" />',
    '<view data-mpxTagName="tag-panel" />',
    '<view mpxTagName="{{ tag-panel }}" />',
    '<view mpxTagName="prefix tag-panel" />',
    '<view mpxTagName@unknown="tag-panel" />',
    '<view mpxTagName@="tag-panel" />',
    '<view mpxTagName@()="tag-panel" />',
  ])(
    'keeps ordinary or indeterminate strings outside tag scopes: %s',
    source => {
      expect(scopes(source, 'tag-panel')).not.toContain(
        'entity.name.tag.html.mpx',
      )
    },
  )
})
