import path from 'node:path'
import { TextDocument } from 'vscode-languageserver-textdocument'
import { URI } from 'vscode-uri'
import { afterEach, expect, it } from 'vitest'
import { createJsonProject } from './utils/createJsonProject'

let project: Awaited<ReturnType<typeof createJsonProject>> | undefined
afterEach(() => {
  project?.dispose()
  project = undefined
})

it.each([
  ['json', ''],
  ['json', '\r\n'],
  ['js', ''],
  ['js', '\r\n'],
])(
  'preserves native multi-definition navigation for %s paths with prefix %j',
  async (lang, eol) => {
    const p = (project = await createJsonProject())
    await p.write('screen.mpx', '<template><view /></template>')
    await p.write('screen.ios.mpx', '<template><view /></template>')
    const source =
      lang === 'json'
        ? `<script type="application/json">${eol}{"pages":["./screen"]}${eol}</script>`
        : `<script name="json">${eol}module.exports = { pages: ['./screen'] }${eol}</script>`
    await p.edit('app.mpx', source)
    const uri = p.uri('app.mpx')
    const document = TextDocument.create(uri.toString(), 'mpx', 1, source)
    const position = document.positionAt(source.indexOf('./screen') + 2)
    const definitions = await p.service.getDefinition(uri, position)
    expect(
      definitions
        ?.map(definition =>
          path.basename(URI.parse(definition.targetUri).fsPath),
        )
        .sort(),
    ).toEqual(['screen.ios.mpx', 'screen.mpx'])
    expect(
      definitions?.map(definition =>
        document.getText(definition.originSelectionRange),
      ),
    ).toEqual(['./screen', './screen'])
    const links = await p.service.getDocumentLinks(uri)
    expect(
      links.filter(link => document.getText(link.range) === './screen'),
    ).toEqual([])
    const hover = await p.service.getHover(uri, position)
    const text = JSON.stringify(hover?.contents)
    expect(text).toContain('[screen.mpx]')
    expect(text).toContain('[screen.ios.mpx]')
    expect(text).not.toContain('[./screen]')
  },
)
