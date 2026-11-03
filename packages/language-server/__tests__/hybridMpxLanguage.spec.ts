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
      if (jsonOnly) expect(remaining.fileListeners).toBe(0)
    }
  },
)

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
