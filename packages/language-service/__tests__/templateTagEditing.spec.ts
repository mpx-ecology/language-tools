import { readFileSync } from 'node:fs'
import path from 'node:path'
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
import { TextDocument } from 'vscode-languageserver-textdocument'
import { URI } from 'vscode-uri'
import { describe, expect, it } from 'vitest'
import { create } from '../src/plugins/mpx-sfc-template'

const fixture = readFileSync(
  path.join(__dirname, 'fixtures/tag-editing/pairs.mpx'),
  'utf8',
)
let fixtureId = 0

function withService<T>(
  text: string,
  run: (context: {
    service: ReturnType<typeof createLanguageService>
    document: TextDocument
    uri: URI
  }) => Promise<T>,
  autoClosingTags?: boolean,
) {
  const uri = URI.file(`/tag-editing-${++fixtureId}.mpx`)
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
    [create(() => undefined)],
    {
      workspaceFolders: [],
      getConfiguration: async <T>(section: string) =>
        (section === 'html.autoClosingTags' ? autoClosingTags : undefined) as
          | T
          | undefined,
    },
    {},
  )
  const document = TextDocument.create(uri.toString(), 'mpx', 0, text)
  return run({ service, document, uri }).finally(() => service.dispose())
}

function autoInsert(code: string, autoClosingTags?: boolean) {
  // | marks the cursor after a single typed character in an unfinished template.
  const marked = `<script setup>\n// 中文前缀验证源码偏移\n</script>\n<template>\n${code}\n</template>`
  const offset = marked.indexOf('|')
  const text = marked.replace('|', '')
  return withService(
    text,
    ({ service, document, uri }) =>
      service.getAutoInsertSnippet(uri, document.positionAt(offset), {
        rangeOffset: offset - 1,
        rangeLength: 0,
        text: text[offset - 1],
      }),
    autoClosingTags,
  )
}

describe('mapped template tag editing', () => {
  it.each([
    ['<view>|', '$0</view>'],
    ['<my-card>|', '$0</my-card>'],
    ['<customOutputComp>|', '$0</customOutputComp>'],
    ['<view><my-card>|</view>', '$0</my-card>'],
    ['<view></|', 'view>'],
    ['<view><my-card></|</view>', 'my-card>'],
    ['<view><text></text></|', 'view>'],
  ])('inserts the matching tag for %s', async (code, expected) => {
    expect(await autoInsert(code)).toBe(expected)
  })

  it.each([
    '<view>|</view>',
    '<view><view>|</view></view>',
    '<my-card />|',
    '<my-card /|>',
    '<view></view>|',
    '<input>|',
    '<view title=">|" />',
    '<view title="/|" />',
    '<!-- <my-card>| -->',
    '<view|',
  ])('does not insert duplicate or unrelated text for %s', async code => {
    expect(await autoInsert(code)).toBeUndefined()
  })

  it.each(['<view>|', '<my-card>|', '<view></|'])(
    'honors html.autoClosingTags=false for %s',
    async code => {
      expect(await autoInsert(code, false)).toBeUndefined()
    },
  )

  it.each([
    'view class="outer"',
    'view class="inner"',
    'my-card title',
    'customOutputComp>',
  ])('maps only the matching pair for %s from either end', async marker => {
    await withService(fixture, async ({ service, document, uri }) => {
      const start = fixture.indexOf(`<${marker}`) + 1
      const name = marker.split(/[ >]/)[0]
      const end = fixture.indexOf(`</${name}>`, start) + 2
      // For the outer view, the first closing view belongs to the inner view.
      const closing = marker.includes('outer')
        ? fixture.lastIndexOf('</view>') + 2
        : end
      const expected = [start, closing].map(offset => ({
        start: document.positionAt(offset),
        end: document.positionAt(offset + name.length),
      }))
      for (const offset of [start, start + name.length, closing + 1]) {
        const result = await service.getLinkedEditingRanges(
          uri,
          document.positionAt(offset),
        )
        expect(result?.ranges).toEqual(expected)
        expect(result?.ranges.map(range => document.getText(range))).toEqual([
          name,
          name,
        ])
      }
    })
  })

  it.each([
    '<my-card />',
    '<my-card',
    '<view></view-mismatch>',
    '<view title="my-card"></view>',
  ])('does not link an absent pair or attribute for %s', async code => {
    const marked = code.includes('title')
      ? code.replace('my-card', 'my-|card')
      : code.replace(/(<[\w-]+)/, '$1|')
    const source = `<template>\n${marked}\n</template>`
    const offset = source.indexOf('|')
    await withService(
      source.replace('|', ''),
      async ({ service, document, uri }) => {
        expect(
          await service.getLinkedEditingRanges(
            uri,
            document.positionAt(offset),
          ),
        ).toBeUndefined()
      },
    )
  })

  it('keeps explicit HTML rename separate from component registration', async () => {
    await withService(fixture, async ({ service, document, uri }) => {
      const start = fixture.indexOf('<my-card') + 1
      const result = await service.getRenameEdits(
        uri,
        document.positionAt(start + 2),
        'new-card',
      )
      const edits = result?.changes?.[uri.toString()]
      expect(edits).toHaveLength(2)
      expect(Object.keys(result!.changes!)).toEqual([uri.toString()])
      expect(TextDocument.applyEdits(document, edits!)).toBe(
        fixture
          .replace('<my-card title', '<new-card title')
          .replace('</my-card>', '</new-card>'),
      )
    })
  })
})
