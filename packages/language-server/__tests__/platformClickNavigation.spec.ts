import path from 'node:path'
import fs from 'node:fs'
import { TextDocument } from 'vscode-languageserver-textdocument'
import { URI } from 'vscode-uri'
import { afterEach, expect, it, vi } from 'vitest'
import type { LanguageServer } from '@volar/language-server'
import { componentNavigationRanges } from '@mpxjs/language-service'
import { getComponentNavigationRangeResponse } from '../src/componentNavigation'
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
    expect(
      componentNavigationRanges(p.service.context, uri).map(range =>
        document.getText(range),
      ),
    ).toEqual(['./screen'])
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

it('underlines only multi-target source ranges and preserves bound literals / template tag ranges', async () => {
  const p = (project = await createJsonProject())
  await p.write('panel.ios.mpx', '<template><view /></template>')
  const source = `<template><demo-panel></demo-panel><explicit-panel /></template>
<script name="json">
const panelPath = './panel'
module.exports = { usingComponents: { 'demo-panel': panelPath, 'explicit-panel': './panel.ios.mpx', 'missing-panel': './missing' } }
</script>`
  await p.edit('index.mpx', source)
  const uri = p.uri('index.mpx')
  const document = TextDocument.create(uri.toString(), 'mpx', 1, source)
  const ranges = componentNavigationRanges(p.service.context, uri)
  expect(ranges.map(range => document.getText(range))).toEqual([
    'demo-panel',
    'demo-panel',
    './panel',
  ])
  const links = await p.service.getDocumentLinks(uri)
  expect(
    links.filter(link => document.getText(link.range) === './panel'),
  ).toEqual([])
  expect(
    links.some(link => document.getText(link.range) === './panel.ios.mpx'),
  ).toBe(true)
})
it('refreshes decoration ranges after platform file creation / deletion without parent edits', async () => {
  const p = (project = await createJsonProject())
  const source = `<script name="json">module.exports={usingComponents:{panel:'./panel'}}</script>`
  await p.edit('index.mpx', source)
  const uri = p.uri('index.mpx')
  const document = TextDocument.create(uri.toString(), 'mpx', 1, source)
  expect(componentNavigationRanges(p.service.context, uri)).toEqual([])
  await p.write('panel.ios.mpx', '<template><view /></template>')
  expect(
    componentNavigationRanges(p.service.context, uri).map(range =>
      document.getText(range),
    ),
  ).toEqual(['./panel'])
  await p.write('panel.ios.mpx', undefined)
  expect(componentNavigationRanges(p.service.context, uri)).toEqual([])
})
it('routes decoration requests to the document project and rejects stale versions', async () => {
  const p = (project = await createJsonProject())
  await p.write('panel.ios.mpx', '<template><view /></template>')
  await p.edit(
    'index.mpx',
    `<script name="json">module.exports={usingComponents:{panel:'./panel'}}</script>`,
  )
  let version = 1
  const getService = vi.fn().mockResolvedValue(p.service)
  const server = {
    documents: { get: () => ({ version }) },
    project: { getLanguageService: getService },
  } as unknown as LanguageServer
  const token = {
    isCancellationRequested: false,
    onCancellationRequested: () => ({ dispose() {} }),
  }
  const params = {
    textDocument: { uri: p.uri('index.mpx').toString(), version: 1 },
  }
  const result = await getComponentNavigationRangeResponse(
    server,
    params,
    token,
  )
  expect(result.version).toBe(1)
  expect(result.ranges).toHaveLength(1)
  expect(getService.mock.calls[0]![0].toString()).toBe(params.textDocument.uri)
  version = 2
  getService.mockClear()
  expect(
    await getComponentNavigationRangeResponse(server, params, token),
  ).toEqual({ version: 2, ranges: [] })
  expect(getService).not.toHaveBeenCalled()
  params.textDocument.version = 2
  getService.mockImplementationOnce(async () => {
    version = 3
    return p.service
  })
  expect(
    await getComponentNavigationRangeResponse(server, params, token),
  ).toEqual({ version: 3, ranges: [] })
})

it('keeps native dependency edits current after a decoration refresh changes only Mpx metadata', async () => {
  const p = (project = await createJsonProject())
  const source = p.read('index.mpx')
  const uri = p.uri('index.mpx')
  const document = TextDocument.create(uri.toString(), 'mpx', 1, source)
  const position = document.positionAt(source.indexOf('config.title,') + 8)
  expect(
    JSON.stringify((await p.service.getHover(uri, position))?.contents),
  ).toContain('string')
  // An external directory change can invalidate path metadata without a source
  // edit or a server watched-file event. The passive decoration request must
  // not suppress the next native JS dependency update.
  fs.writeFileSync(path.join(p.root, 'unrelated-directory-entry.txt'), 'probe')
  componentNavigationRanges(p.service.context, uri)
  expect(
    JSON.stringify((await p.service.getHover(uri, position))?.contents),
  ).toContain('string')
  await p.edit('shared.js', 'module.exports = { title: 123, count: 2 }')
  expect(
    JSON.stringify((await p.service.getHover(uri, position))?.contents),
  ).toContain('number')
  await p.close('shared.js')
  expect(
    JSON.stringify((await p.service.getHover(uri, position))?.contents),
  ).toContain('string')
})

it('keeps native JSON updates when a style edit changes only non-TypeScript virtual snapshots', async () => {
  const p = (project = await createJsonProject())
  const source = p.read('index.mpx')
  const uri = p.uri('index.mpx')
  const document = TextDocument.create(uri.toString(), 'mpx', 1, source)
  const position = document.positionAt(source.indexOf('config.title,') + 8)
  expect(
    JSON.stringify((await p.service.getHover(uri, position))?.contents),
  ).toContain('string')
  await p.edit(
    'index.mpx',
    source + '<style>.version-probe { color: red; }</style>',
  )
  await p.edit('shared.js', 'module.exports = { title: 123, count: 2 }')
  expect(
    JSON.stringify((await p.service.getHover(uri, position))?.contents),
  ).toContain('number')
  await p.edit(
    'index.mpx',
    source + '<style>.version-probe { color: blue; }</style>',
  )
  await p.close('shared.js')
  expect(
    JSON.stringify((await p.service.getHover(uri, position))?.contents),
  ).toContain('string')
})
