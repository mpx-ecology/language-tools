import { TextDocument } from 'vscode-languageserver-textdocument'
import { afterEach, expect, it } from 'vitest'
import { createJsonProject } from './utils/createJsonProject'

let project: Awaited<ReturnType<typeof createJsonProject>> | undefined
afterEach(() => {
  project?.dispose()
  project = undefined
})

it.each(['', '\n', '\r\n'])(
  'maps quoted, bound and expression paths with prefix %j',
  async eol => {
    const p = (project = await createJsonProject())
    const body = [
      "const panelPath = './panel.mpx'",
      "const missingPath = './missing-bound.mpx'",
      "const config = { panel: './missing-property.mpx' }",
      'module.exports = { usingComponents: {',
      "  quoted: './panel.mpx', bound: panelPath,",
      "  missing: './missing-quoted.mpx', missingBound: missingPath,",
      '  expression: config.panel,',
      '} }',
    ].join(eol || '\n')
    const source = '<script name="json">' + eol + body + eol + '</script>'
    await p.edit('index.mpx', source)
    const uri = p.uri('index.mpx')
    const doc = TextDocument.create(uri.toString(), 'mpx', 1, source)
    const diagnostics = (await p.service.getDiagnostics(uri)).filter(
      d => d.source === 'mpx-json',
    )
    expect(diagnostics.map(d => doc.getText(d.range)).sort()).toEqual([
      './missing-bound.mpx',
      './missing-quoted.mpx',
      'config.panel',
    ])
    for (const error of diagnostics) {
      const text = doc.getText(error.range)
      expect(doc.offsetAt(error.range.start)).toBe(source.indexOf(text))
      expect(doc.offsetAt(error.range.end)).toBe(
        source.indexOf(text) + text.length,
      )
    }
    const links = await p.service.getDocumentLinks(uri)
    expect(links.map(link => doc.getText(link.range))).toEqual([
      './panel.mpx',
      './panel.mpx',
    ])
    expect(
      links.map(link => doc.offsetAt(link.range.start)).sort((a, b) => a - b),
    ).toEqual([
      source.indexOf('./panel.mpx'),
      source.lastIndexOf('./panel.mpx'),
    ])
  },
)
