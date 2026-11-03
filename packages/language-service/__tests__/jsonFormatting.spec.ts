import fs from 'node:fs'
import path from 'node:path'
import { TextDocument } from 'vscode-languageserver-textdocument'
import { afterEach, expect, it } from 'vitest'
import { createJsonProject } from '../../language-server/__tests__/utils/createJsonProject'

let project: Awaited<ReturnType<typeof createJsonProject>> | undefined
afterEach(() => {
  project?.dispose()
  project = undefined
})

for (const leadingSpace of ['', ' \t'])
  for (const eol of ['\n', '\r\n'])
    for (const prettier of [false, true]) {
      it.each([
        [
          'JavaScript',
          '<script name="json">',
          'module.exports={navigationBarTitleText:"标题"}',
        ],
        [
          'JSON',
          '<script type="application/json">',
          '{"navigationBarTitleText":"标题"}',
        ],
      ])(
        'preserves %s block boundaries and formatting idempotence (prettier ' +
          prettier +
          ', eol ' +
          JSON.stringify(eol) +
          ',' +
          JSON.stringify(leadingSpace) +
          ')',
        async (_, tag, body) => {
          const p = (project = await createJsonProject())
          fs.symlinkSync(
            path.resolve(__dirname, '../../../node_modules'),
            path.join(p.root, 'node_modules'),
            'dir',
          )
          p.setConfiguration('mpx.format.script.prettier', prettier)
          p.setConfiguration('prettier', { endOfLine: 'auto' })
          const source =
            tag + leadingSpace + eol + body + eol + '</script>' + eol
          await p.edit('index.mpx', source)
          const uri = p.uri('index.mpx')
          const edits = await p.service.getDocumentFormattingEdits(
            uri,
            { tabSize: 2, insertSpaces: true },
            undefined,
            undefined,
          )
          const formatted = TextDocument.applyEdits(
            TextDocument.create(uri.toString(), 'mpx', 1, source),
            edits ?? [],
          )
          expect(edits?.length).toBeGreaterThan(0)
          expect(formatted).not.toContain(body)
          expect(formatted).toMatch(
            /navigationBarTitleText["']?:\s+["']标题["']/,
          )
          expect(formatted).toMatch(/^<script[^>]*>[\t ]*\r?\n/)
          expect(formatted).toMatch(/\r?\n<\/script>/)
          expect(formatted).not.toMatch(/<script[^>]*>\r?\n\r?\n/)
          await p.edit('index.mpx', formatted)
          const again = await p.service.getDocumentFormattingEdits(
            uri,
            { tabSize: 2, insertSpaces: true },
            undefined,
            undefined,
          )
          expect(
            TextDocument.applyEdits(
              TextDocument.create(uri.toString(), 'mpx', 2, formatted),
              again ?? [],
            ),
          ).toBe(formatted)
        },
      )
    }
