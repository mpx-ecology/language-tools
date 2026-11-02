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
import { describe, expect, it } from 'vitest'
import { create as createStyleCSSPlugin } from '../src/plugins/mpx-sfc-style-css'
import { create as createStyleDirectiveCommentsPlugin } from '../src/plugins/mpx-sfc-style-directive-comments'

let fixtureId = 0

async function completeStyle(content: string, lang = 'css') {
  // | marks an intentional in-progress editor state, not a compiler fixture.
  const source = `<template><view /></template>\n<style lang="${lang}">\n${content}\n</style>`
  const offset = source.indexOf('|')
  const text = source.replace('|', '')
  const uri = URI.file(`/style-directive-integration-${++fixtureId}.mpx`)
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
    // Preserve production registration order: CSS is the main completion
    // provider, while Mpx comments add suggestions on the same mapped style.
    [createStyleCSSPlugin(), createStyleDirectiveCommentsPlugin()],
    { workspaceFolders: [] },
    {},
  )
  try {
    const document = TextDocument.create(uri.toString(), 'mpx', 0, text)
    const result = await service.getCompletionItems(
      uri,
      document.positionAt(offset),
    )
    return { document, result }
  } finally {
    service.dispose()
  }
}

describe('mapped style directive completion with the CSS provider', () => {
  it.each(['css', 'scss', 'less', 'postcss'])(
    'combines %s directive completions and maps edits back to the SFC',
    async lang => {
      const { document, result } = await completeStyle(
        "/* @mpx-i| (__mpx_mode__ === 'wx') */\n.x { color: red; }",
        lang,
      )
      const item = result.items.find(item => item.label === '@mpx-if')
      expect(item).toBeDefined()
      expect(
        TextDocument.applyEdits(document, [item!.textEdit as TextEdit]),
      ).toBe(document.getText().replace('@mpx-i', '@mpx-if'))
    },
  )

  it('supplies a condition tab stop and one pair of comment delimiters', async () => {
    const { document, result } = await completeStyle('  @mpx-e|')
    const item = result.items.find(item => item.label === '@mpx-elif')
    expect(item).toBeDefined()
    expect(
      TextDocument.applyEdits(document, [item!.textEdit as TextEdit]),
    ).toBe(document.getText().replace('@mpx-e', '/* @mpx-elif ($1) */'))
  })

  it('retains normal CSS completions away from directive prefixes', async () => {
    const { result } = await completeStyle('.x { co| }')
    expect(result.items.some(item => item.label === 'color')).toBe(true)
    expect(result.items.some(item => item.label.startsWith('@mpx-'))).toBe(
      false,
    )
  })

  it('does not add directives inside string content', async () => {
    const { result } = await completeStyle('.x { content: "/* @mpx-i| */"; }')
    expect(result.items.some(item => item.label.startsWith('@mpx-'))).toBe(
      false,
    )
  })
})
