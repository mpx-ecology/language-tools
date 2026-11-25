import path from 'node:path'
import fs from 'node:fs'
import { URI } from 'vscode-uri'
import { TextDocument } from 'vscode-languageserver-textdocument'
import { expect, it } from 'vitest'
import { createJsonProject } from './utils/createJsonProject'

const fixtureRoot = path.resolve(
  __dirname,
  '../../language-core/__tests__/fixtures/registered-components',
)
const options = {
  paths: {
    '@mpxjs/core': [
      path.resolve(
        __dirname,
        '../../language-core/node_modules/@mpxjs/core/@types/index',
      ),
    ],
  },
}

it.each([true, false])(
  'keeps application buffers and watched dependencies in the shared project (JSON-only: %s)',
  async jsonOnly => {
    const p = await createJsonProject(jsonOnly, options, true, fixtureRoot)
    const page = 'app-a/pages/index.mpx'
    const host = p.service.context.project.typescript!.languageServiceHost
    const getFiles = host.getScriptFileNames
    let programFileReads = 0
    host.getScriptFileNames = () => {
      programFileReads++
      return getFiles()
    }
    const document = TextDocument.create(
      p.uri(page).toString(),
      'mpx',
      0,
      p.read(page),
    )
    const names = async (file = page) => {
      const doc =
        file === page
          ? document
          : TextDocument.create(p.uri(file).toString(), 'mpx', 0, p.read(file))
      const result = await p.service.getCompletionItems(
        p.uri(file),
        doc.positionAt(doc.getText().indexOf('<app-panel') + 5),
      )
      return result.items.map(item => item.label)
    }
    try {
      expect(await names()).toContain('app-panel')
      const definitions = await p.service.getDefinition(
        p.uri(page),
        document.positionAt(document.getText().indexOf('<app-panel') + 5),
      )
      expect(
        definitions?.some(
          def =>
            fs.realpathSync(URI.parse(def.targetUri).fsPath) ===
            fs.realpathSync(p.uri('app-a/panel.mpx').fsPath),
        ),
      ).toBe(true)
      expect(await names()).not.toContain('other-panel')
      const original = p.read('app-a/app.mpx')
      await p.edit(
        'app-a/app.mpx',
        original.replace('app-panel', 'buffer-panel'),
      )
      expect(await names()).toContain('buffer-panel')
      expect(await names()).not.toContain('app-panel')
      await p.write(
        'app-a/app.mpx',
        original.replace('app-panel', 'disk-panel'),
      )
      expect(await names()).toContain('buffer-panel')
      await p.close('app-a/app.mpx')
      expect(await names()).toContain('disk-panel')
      await p.write(
        'app-a/app.mpx',
        original.replace('app-panel', 'updated-panel'),
      )
      expect(await names()).toContain('updated-panel')
      expect(await names()).not.toContain('disk-panel')
      if (jsonOnly) expect(programFileReads).toBe(0)
    } finally {
      const remaining = p.dispose()
      expect(remaining.documentListeners).toBe(0)
      expect(remaining.fileListeners).toBe(jsonOnly ? 0 : 1)
    }
  },
)

it.each([true, false])(
  'refreshes on the first request when app.mpx JSON is cleared/restored, packages change, or closer app.mpx is created (JSON-only: %s)',
  async jsonOnly => {
    const p = await createJsonProject(jsonOnly, options, true, fixtureRoot)
    const page = 'app-a/pages/index.mpx'
    const subPage = 'app-a/sub/pages/index.mpx'
    const host = p.service.context.project.typescript!.languageServiceHost
    const getFiles = host.getScriptFileNames
    let programFileReads = 0
    host.getScriptFileNames = () => {
      programFileReads++
      return getFiles()
    }
    const pageDoc = TextDocument.create(
      p.uri(page).toString(),
      'mpx',
      0,
      p.read(page),
    )
    const subDoc = TextDocument.create(
      p.uri(subPage).toString(),
      'mpx',
      0,
      p.read(subPage),
    )
    const completionLabels = async (file: string, doc: TextDocument) => {
      const result = await p.service.getCompletionItems(
        p.uri(file),
        doc.positionAt(doc.getText().indexOf('<app-panel') + 5),
      )
      return result.items.map(item => item.label)
    }
    try {
      // 1. Clear app-a/app.mpx JSON block completely, then restore it later.
      const originalApp = p.read('app-a/app.mpx')
      expect(await completionLabels(page, pageDoc)).toContain('app-panel')
      await p.edit('app-a/app.mpx', '<template><view /></template>')
      expect(await completionLabels(page, pageDoc)).not.toContain('app-panel')

      await p.edit(
        'app-a/app.mpx',
        originalApp.replace('app-panel', 'restored-panel'),
      )
      expect(await completionLabels(page, pageDoc)).toContain('restored-panel')
      await p.edit('app-a/app.mpx', originalApp)

      // 2. Remove subpackage entry from ancestor packages -> subPage immediately switches to sub/app.mpx.
      expect(await completionLabels(subPage, subDoc)).toContain('app-panel')
      expect(await completionLabels(subPage, subDoc)).not.toContain(
        'package-only',
      )
      await p.edit(
        'app-a/app.mpx',
        originalApp.replace('"packages":["./sub/app.mpx?root=sub"],', ''),
      )
      expect(await completionLabels(subPage, subDoc)).toContain('package-only')
      await p.edit('app-a/app.mpx', originalApp)
      expect(await completionLabels(subPage, subDoc)).toContain('app-panel')

      // 3. Create a previously missing closer app.mpx via unsaved buffer first, then watched file.
      await p.edit(
        'app-a/pages/app.mpx',
        '<script type="application/json">{"usingComponents":{"closer-buffer":"../../panel.mpx"}}</script>',
      )
      expect(await completionLabels(page, pageDoc)).toContain('closer-buffer')
      await p.close('app-a/pages/app.mpx')
      expect(await completionLabels(page, pageDoc)).toContain('app-panel')

      const createdApp =
        '<script type="application/json">{"usingComponents":{"closer-disk":"../../panel.mpx"}}</script>'
      await p.write('app-a/pages/app.mpx', createdApp)
      expect(await completionLabels(page, pageDoc)).toContain('closer-disk')
      await p.write('app-a/pages/app.mpx', undefined)
      expect(await completionLabels(page, pageDoc)).toContain('app-panel')

      if (jsonOnly) expect(programFileReads).toBe(0)
    } finally {
      const remaining = p.dispose()
      expect(remaining.documentListeners).toBe(0)
      expect(remaining.fileListeners).toBe(jsonOnly ? 0 : 1)
    }
  },
)

it('handles first Agent LSP semantic requests after app.mpx edit and isolates app.mpx semantic tokens', async () => {
  const p = await createJsonProject(false, options, true, fixtureRoot)
  const page = 'app-a/pages/index.mpx'
  const pageSource = p.read(page)
  const pageDoc = TextDocument.create(
    p.uri(page).toString(),
    'mpx',
    0,
    pageSource,
  )
  const titlePos = pageDoc.positionAt(pageSource.indexOf('title="') + 1)
  try {
    // Baseline semantic hover & diagnostics on page before editing app.mpx.
    const initialHover = await p.service.getHover(p.uri(page), titlePos)
    expect(JSON.stringify(initialHover?.contents)).toContain('title: string')
    const initialDiags = await p.service.getDiagnostics(p.uri(page))
    expect(initialDiags.filter(d => d.code === 2322)).toHaveLength(2)

    // Edit app.mpx to retarget app-panel to ./local.mpx and send hover FIRST (no completion warm-up).
    const originalApp = p.read('app-a/app.mpx')
    await p.edit(
      'app-a/app.mpx',
      originalApp.replace('"./panel.mpx"', '"./local.mpx"'),
    )
    const firstHover = await p.service.getHover(p.uri(page), titlePos)
    expect(JSON.stringify(firstHover?.contents ?? '')).not.toContain(
      'title: string',
    )
    const firstDiags = await p.service.getDiagnostics(p.uri(page))
    // local-panel is used with title where count is only optional or title is unknown -> only TypedPanel has title: string now.
    expect(
      firstDiags.filter(
        d => d.code === 2322 && String(d.message).includes('string'),
      ),
    ).toHaveLength(1)

    // Pure JSON app.mpx must not receive descendant page semantic tokens even after editing pages.
    await p.edit(page, pageSource)
    const appDoc = TextDocument.create(
      p.uri('app-a/app.mpx').toString(),
      'mpx',
      0,
      p.read('app-a/app.mpx'),
    )
    const appTokens = await p.service.getSemanticTokens(
      p.uri('app-a/app.mpx'),
      {
        start: appDoc.positionAt(0),
        end: appDoc.positionAt(appDoc.getText().length),
      },
      p.service.semanticTokenLegend,
    )
    expect(appTokens?.data ?? []).toEqual([])
  } finally {
    const remaining = p.dispose()
    expect(remaining.documentListeners).toBe(0)
    expect(remaining.fileListeners).toBe(1)
  }
})

it.each([true, false])(
  'retains JSON JS semantics while application registrations refresh (JSON-only: %s)',
  async jsonOnly => {
    const p = await createJsonProject(jsonOnly, options, true, fixtureRoot)
    const page = 'app-a/pages/index.mpx'
    try {
      const source = p
        .read(page)
        .replace(
          '<script type="application/json">\n{"usingComponents":{"local-panel":"../local.mpx"}}',
          `<script name="json">\nconst shared = require('../shared')\nconst config = { title: shared.title, usingComponents: { 'local-panel': '../local.mpx' } }\nmodule.exports = config`,
        )
      expect(source).toContain("require('../shared')")
      await p.edit(page, source)
      const document = TextDocument.create(
        p.uri(page).toString(),
        'mpx',
        0,
        source,
      )
      const position = document.positionAt(
        source.indexOf('shared.title') + 'shared.'.length + 1,
      )
      const hover = async () =>
        JSON.stringify(
          (await p.service.getHover(p.uri(page), position))?.contents,
        )
      expect(await hover()).toContain('string')
      await p.edit('app-a/shared.js', 'module.exports = { title: 123 }\n')
      expect(await hover()).toContain('number')
      const app = p.read('app-a/app.mpx')
      await p.edit('app-a/app.mpx', app.replace('app-panel', 'buffer-panel'))
      const completion = await p.service.getCompletionItems(
        p.uri(page),
        document.positionAt(source.indexOf('<app-panel') + 5),
      )
      expect(completion.items.map(item => item.label)).toContain('buffer-panel')
      expect(await hover()).toContain('number')
      await p.close('app-a/shared.js')
      expect(await hover()).toContain('string')
    } finally {
      const remaining = p.dispose()
      expect(remaining.documentListeners).toBe(0)
      if (jsonOnly) expect(remaining.fileListeners).toBe(0)
    }
  },
)
