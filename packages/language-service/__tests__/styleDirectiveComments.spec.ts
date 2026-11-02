import type { LanguageServiceContext } from '@volar/language-service'
import type * as vscode from 'vscode-languageserver-protocol'
import { TextDocument } from 'vscode-languageserver-textdocument'
import { describe, expect, it } from 'vitest'
import { URI } from 'vscode-uri'
import { create } from '../src/plugins/mpx-sfc-style-directive-comments'

const sourceUri = URI.parse('file:///style-directives.mpx')
const completionContext: vscode.CompletionContext = { triggerKind: 1 }
const token: vscode.CancellationToken = {
  isCancellationRequested: false,
  onCancellationRequested: () => ({ dispose() {} }),
}

// These snippets intentionally include unfinished editor states; | marks the
// cursor. They test completions while typing, rather than runtime compilation.

async function complete(
  source: string,
  language = 'css',
  embedded = 'style_0',
) {
  const offset = source.indexOf('|')
  expect(offset).toBeGreaterThanOrEqual(0)
  const document = TextDocument.create(
    'file:///style-directives.mpx.embedded.css',
    language,
    0,
    source.slice(0, offset) + source.slice(offset + 1),
  )
  const context = {
    decodeEmbeddedDocumentUri: () => [sourceUri, embedded],
    language: {
      scripts: {
        get: () => ({
          generated: { embeddedCodes: new Map([[embedded, { id: embedded }]]) },
        }),
      },
    },
  } as unknown as LanguageServiceContext
  const result = await create()
    .create(context)
    .provideCompletionItems?.(
      document,
      document.positionAt(offset),
      completionContext,
      token,
    )
  return { document, result }
}

async function accept(source: string, label: string, language = 'css') {
  const { document, result } = await complete(source, language)
  const item = result?.items.find(item => item.label === label)
  expect(item, source).toBeDefined()
  const edit = item!.textEdit as vscode.TextEdit
  expect(edit, source).toBeDefined()
  expect(item!.insertTextFormat).toBe(2)
  const text = TextDocument.applyEdits(document, [edit])
  return { text, edit }
}

describe('style conditional directive completion', () => {
  it.each(['css', 'scss', 'less', 'postcss', 'sass', 'stylus'])(
    'completes a directive prefix in an existing %s block comment',
    async language => {
      const { text } = await accept('  /* @mpx-i| */', '@mpx-if', language)
      expect(text).toBe('  /* @mpx-if ($1) */')
    },
  )

  it.each([
    ['@|', '@mpx-if', '/* @mpx-if ($1) */'],
    ['  @mpx-e|', '@mpx-elif', '  /* @mpx-elif ($1) */'],
    ['\t@mpx-en|', '@mpx-endif', '\t/* @mpx-endif */'],
    ['/* @|', '@mpx-else', '/* @mpx-else */'],
    ['/* @mp|x-if */', '@mpx-if', '/* @mpx-if ($1) */'],
    ['/* @mpx-e|lse */', '@mpx-elif', '/* @mpx-elif ($1) */'],
    ['/*\n  @mpx-i|\n*/', '@mpx-if', '/*\n  @mpx-if ($1)\n*/'],
    ['/* @mpx-i| (__mpx_mode__) */', '@mpx-if', '/* @mpx-if (__mpx_mode__) */'],
    [
      '/* @mpx-e|\n (__mpx_mode__)\n*/',
      '@mpx-elif',
      '/* @mpx-elif\n (__mpx_mode__)\n*/',
    ],
    ['/* @mpx-i| (__mpx_mode__)', '@mpx-if', '/* @mpx-if (__mpx_mode__)'],
    ['@|\n(expression)', '@mpx-if', '/* @mpx-if ($1) */\n(expression)'],
  ])(
    'accepts %s without duplicating comments or conditions',
    async (source, label, expected) => {
      expect((await accept(source, label)).text).toBe(expected)
    },
  )

  it('replaces only the command under the cursor and positions the condition tab stop', async () => {
    const { text, edit } = await accept(
      '.x {}\r\n  /* @mpx-i| */\r\n.y {}',
      '@mpx-if',
    )
    expect(edit.range).toEqual({
      start: { line: 1, character: 5 },
      end: { line: 1, character: 11 },
    })
    expect(text).toBe('.x {}\r\n  /* @mpx-if ($1) */\r\n.y {}')
    expect(text.indexOf('$1')).toBe(
      text.indexOf('@mpx-if') + '@mpx-if ('.length,
    )
  })

  it('filters an explicit partial prefix and requests updated results while typing', async () => {
    const { result } = await complete('/* @mpx-el| */')
    expect(result?.items.map(item => item.label)).toEqual([
      '@mpx-elif',
      '@mpx-else',
    ])
    expect(result?.isIncomplete).toBe(true)
  })

  it.each(['scss', 'less', 'sass', 'stylus'])(
    'preserves an existing %s line comment',
    async language => {
      expect((await accept('// @mpx-el|', '@mpx-elif', language)).text).toBe(
        '// @mpx-elif ($1)',
      )
    },
  )

  it('does not use a following line as the condition of a line comment', async () => {
    expect(
      (await accept('// @|\n(expression)', '@mpx-if', 'stylus')).text,
    ).toBe('// @mpx-if ($1)\n(expression)')
  })

  it('does not offer line comments in plain PostCSS', async () => {
    expect((await complete('// @|', 'postcss')).result).toBeUndefined()
  })

  it.each([
    '.x { content: "/* @mpx-i| */"; }',
    ".x { content: '/* @mpx-i| */'; }",
    '.x { content: "escaped \\" /* @mpx-i| */"; }',
    '/* ordinary prose @mpx-i| */',
    '/* ordinary\n/* @mpx-i| */',
    '.x { @mpx-i| }',
    '// @mpx-i|',
    '@media|',
    '/* @mpx-unknown| */',
    '/* @mpx-if (__mpx_|mode__) */',
    '@mpx-i| (__mpx_mode__)',
  ])('does not edit unrelated or ambiguous CSS: %s', async source => {
    expect((await complete(source)).result).toBeUndefined()
  })

  it.each(['scss', 'less', 'stylus'])(
    'ignores comment-looking text in a %s interpolation string',
    async language => {
      expect(
        (
          await complete(
            '.x { content: "#{\'value\'} /* @mpx-i| */" }',
            language,
          )
        ).result,
      ).toBeUndefined()
    },
  )

  it('does not edit same-quote strings inside SCSS interpolation', async () => {
    expect(
      (await complete('.x { content: "#{"/* @mpx-i| */"}"; }', 'scss')).result,
    ).toBeUndefined()
  })

  it('leaves inline comments after stylesheet statements out of scope', async () => {
    expect(
      (
        await complete(
          '.x { background: url(http://example.com); } /* @mpx-i| */',
          'scss',
        )
      ).result,
    ).toBeUndefined()
  })

  it('completes a standalone SCSS directive after a URL on the preceding line', async () => {
    expect(
      (
        await accept(
          '.x { background: url(http://example.com); }\n/* @mpx-i| */',
          '@mpx-if',
          'scss',
        )
      ).text,
    ).toBe('.x { background: url(http://example.com); }\n/* @mpx-if ($1) */')
  })

  it('does not treat a non-style embedded document as a stylesheet', async () => {
    expect(
      (await complete('@|', 'typescript', 'script_ts')).result,
    ).toBeUndefined()
  })
})
