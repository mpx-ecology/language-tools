import { TextDocument } from 'vscode-languageserver-textdocument'
import { afterEach, describe, expect, it } from 'vitest'
import { createJsonProject } from './utils/createJsonProject'

type Project = Awaited<ReturnType<typeof createJsonProject>>
let project: Project | undefined
afterEach(() => {
  project?.dispose()
  project = undefined
})

const position = (p: Project, source: string, text: string) =>
  TextDocument.create(
    p.uri('index.mpx').toString(),
    'mpx',
    1,
    source,
  ).positionAt(source.indexOf(text) + 1)
const hoverText = (
  hover: Awaited<ReturnType<Project['service']['getHover']>>,
) => JSON.stringify(hover?.contents ?? '')

it('refreshes imported JSON types through the existing project file watcher', async () => {
  const p = (project = await createJsonProject(true, {
    resolveJsonModule: true,
  }))
  await p.write('data.json', '{"title":"initial"}')
  const source =
    '<script name="json">\nconst data = require("./data.json")\nmodule.exports = { navigationBarTitleText: data.title }\n</script>'
  await p.edit('index.mpx', source)
  const uri = p.uri('index.mpx')
  const at = position(p, source, 'title }')
  expect(hoverText(await p.service.getHover(uri, at))).toContain('string')
  await p.write('data.json', '{"title":42}')
  expect(hoverText(await p.service.getHover(uri, at))).toContain('number')
})

it.each([true, false])(
  'honors project checkJs=%s for JSON scripts',
  async checkJs => {
    const p = (project = await createJsonProject(true, { checkJs }))
    await p.edit(
      'index.mpx',
      `<script name="json">
/** @type {number} */
const count = "wrong"
module.exports = {
  navigationBarTitleText: String(count),
  usingComponents: { widget: "./missing-widget" },
}
</script>`,
    )
    const codes = (await p.service.getDiagnostics(p.uri('index.mpx'))).map(
      d => d.code,
    )
    expect(codes.includes(2322)).toBe(checkJs)
    expect(codes).toContain(4001)
  },
)

it('validates unchecked literal configs without loading the JSON TypeScript program', async () => {
  const p = (project = await createJsonProject(true, { checkJs: false }))
  const source = `<script name="json">
module.exports = {
  usingComponents: { widget: "./missing-widget" },
  navigationBarTitleText: "title",
  component: "invalid",
}
</script>`
  await p.edit('index.mpx', source)
  const uri = p.uri('index.mpx')
  const host = p.service.context.project.typescript!.languageServiceHost
  const getFiles = host.getScriptFileNames
  let reads = 0
  host.getScriptFileNames = () => {
    reads++
    return getFiles()
  }

  const diagnostics = await p.service.getDiagnostics(uri)
  expect(diagnostics.map(d => d.code)).toContain(4001)
  expect(diagnostics.some(d => d.source === 'mpx-json-schema')).toBe(true)
  expect(reads).toBe(0)

  await p.edit(
    'index.mpx',
    source.replace(
      '<script name="json">\n',
      '<script name="json">#!/usr/bin/env node\n',
    ),
  )
  expect((await p.service.getDiagnostics(uri)).map(d => d.code)).toContain(
    18026,
  )
  expect(reads).toBeGreaterThan(0)

  await p.edit('index.mpx', source.replace('"title"', ''))
  expect((await p.service.getDiagnostics(uri)).map(d => d.code)).toContain(1109)
  expect(reads).toBeGreaterThan(0)

  await p.edit(
    'index.mpx',
    source
      .replace(
        'module.exports',
        '// @ts-check\n/** @type {number} */\nconst count = "wrong"\nmodule.exports',
      )
      .replace('"title"', 'String(count)'),
  )
  expect((await p.service.getDiagnostics(uri)).map(d => d.code)).toContain(2322)
})

it('loads JSON scripts into the semantic project only when requested', async () => {
  const p = (project = await createJsonProject())
  const source =
    '<script name="json">\n// @ts-check\n/** @type {number} */\nconst count = "wrong"\nmodule.exports = { count }\n</script>'
  await p.write('index.mpx', source)
  await p.write('unopened.mpx', source)
  const host = p.service.context.project.typescript!.languageServiceHost
  const hasScript = (name: string) =>
    host.getScriptFileNames().some(file => file.endsWith(name + '.__json.cjs'))
  expect(hasScript('index.mpx')).toBe(false)
  expect(hasScript('unopened.mpx')).toBe(false)
  expect(
    (await p.service.getDiagnostics(p.uri('index.mpx'))).map(d => d.code),
  ).toContain(2322)
  expect(hasScript('index.mpx')).toBe(true)
  expect(hasScript('unopened.mpx')).toBe(false)
  expect(
    (await p.service.getDiagnostics(p.uri('unopened.mpx'))).map(d => d.code),
  ).toContain(2322)
  expect(hasScript('unopened.mpx')).toBe(true)
})

it('removes deleted JSON roots and bounds closed roots while pinning active requests', async () => {
  const p = (project = await createJsonProject(true, { checkJs: true }))
  const source =
    '<script name="json">const n = 1; module.exports = { n }</script>'
  await p.write('index.mpx', source)
  await p.edit('index.mpx', source)
  await p.service.getDiagnostics(p.uri('index.mpx'))
  const host = p.service.context.project.typescript!.languageServiceHost
  expect(
    host
      .getScriptFileNames()
      .some(file => file.endsWith('index.mpx.__json.cjs')),
  ).toBe(true)
  await p.close('index.mpx')
  await p.write('index.mpx', undefined)
  expect(
    host
      .getScriptFileNames()
      .some(file => /index\.mpx(?:\.__json\.cjs)?$/.test(file)),
  ).toBe(false)
  const include = p.service.context.project.mpx!.includeJsonScript!
  await p.write('pending.mpx', source)
  const release = include(p.uri('pending.mpx'))
  for (let i = 0; i < 40; i++) {
    const name = `cached-${i}.mpx`
    await p.write(name, source)
    include(p.uri(name))?.()
  }
  expect(
    host.getScriptFileNames().filter(file => file.endsWith('.mpx.__json.cjs')),
  ).toHaveLength(33)
  expect(
    host
      .getScriptFileNames()
      .some(file => file.endsWith('pending.mpx.__json.cjs')),
  ).toBe(true)
  release?.()
  expect(
    host.getScriptFileNames().filter(file => file.endsWith('.mpx.__json.cjs')),
  ).toHaveLength(32)
  await p.service.getDiagnostics(p.uri('pending.mpx'))
  expect(
    host
      .getScriptFileNames()
      .some(file => file.endsWith('pending.mpx.__json.cjs')),
  ).toBe(true)
})

it('preserves deleted JSON roots while open or requested, then releases them', async () => {
  const p = (project = await createJsonProject(true, { checkJs: true }))
  const source =
    '<script name="json">/** @type {number} */ const n = "wrong"; module.exports = { n }</script>'
  const host = p.service.context.project.typescript!.languageServiceHost
  const hasRoot = (name: string) =>
    host.getScriptFileNames().some(file => file.endsWith(name + '.__json.cjs'))
  await p.write('index.mpx', source)
  await p.edit('index.mpx', source)
  await p.service.getDiagnostics(p.uri('index.mpx'))
  await p.write('index.mpx', undefined)
  expect(hasRoot('index.mpx')).toBe(true)
  expect(
    (await p.service.getDiagnostics(p.uri('index.mpx'))).map(d => d.code),
  ).toContain(2322)
  await p.close('index.mpx')
  host.getProjectVersion?.()
  expect(hasRoot('index.mpx')).toBe(false)
  await p.write('pending.mpx', source)
  const release = p.service.context.project.mpx!.includeJsonScript!(
    p.uri('pending.mpx'),
  )
  await p.write('pending.mpx', undefined)
  expect(
    host.getScriptFileNames().some(file => file.endsWith('pending.mpx')),
  ).toBe(true)
  release?.()
  expect(
    host
      .getScriptFileNames()
      .some(file => /pending\.mpx(?:\.__json\.cjs)?$/.test(file)),
  ).toBe(false)
})

for (const jsonOnly of [true, false]) {
  describe('JSON module environment (JSON-only host: ' + jsonOnly + ')', () => {
    it('types injected CommonJS names without Node types or business-script leakage', async () => {
      const p = (project = await createJsonProject(jsonOnly))
      const source =
        '<script setup lang="ts">\nconst runtimeDir = __dirname\ndefineExpose({ runtimeDir })\n</script>\n<script name="json">\nmodule.exports = { dirname: __dirname, filename: __filename }\n</script>'
      await p.edit('index.mpx', source)
      const uri = p.uri('index.mpx')
      const doc = TextDocument.create(uri.toString(), 'mpx', 1, source)
      const diagnostics = await p.service.getDiagnostics(uri)
      const jsonStart = source.indexOf('<script name="json">')
      expect(
        diagnostics.filter(
          d => doc.offsetAt(d.range.start) > jsonStart && d.severity === 1,
        ),
      ).toEqual([])
      expect(
        hoverText(
          await p.service.getHover(uri, position(p, source, '__filename')),
        ),
      ).toContain('string')
      if (!jsonOnly)
        expect(
          diagnostics.some(
            d =>
              d.code === 2304 &&
              doc.offsetAt(d.range.start) < jsonStart &&
              d.message.includes('__dirname'),
          ),
        ).toBe(true)
    })

    it('preserves project global augmentations and refreshes unsaved changes', async () => {
      const p = (project = await createJsonProject(jsonOnly))
      const globals =
        'export {}; declare global { const __project_flag__: boolean }'
      await p.write('project-globals.ts', globals)
      const source =
        '<script name="json">module.exports = { flag: __project_flag__ }</script>'
      await p.edit('index.mpx', source)
      const uri = p.uri('index.mpx')
      expect(
        (await p.service.getDiagnostics(uri)).filter(d => d.code === 2304),
      ).toEqual([])
      expect(
        hoverText(
          await p.service.getHover(
            uri,
            position(p, source, '__project_flag__'),
          ),
        ),
      ).toContain('boolean')
      await p.edit('project-globals.ts', globals.replace('boolean', 'string'))
      expect(
        hoverText(
          await p.service.getHover(
            uri,
            position(p, source, '__project_flag__'),
          ),
        ),
      ).toContain('string')
      await p.close('project-globals.ts')
      expect(
        hoverText(
          await p.service.getHover(
            uri,
            position(p, source, '__project_flag__'),
          ),
        ),
      ).toContain('boolean')
    })

    it.each([
      { pragma: '// @ts-check', statement: '', suppressed: false },
      { pragma: '// @ts-nocheck', statement: '', suppressed: true },
      {
        pragma: '// @ts-check',
        statement: '// @ts-expect-error intentional type mismatch',
        suppressed: true,
      },
      {
        pragma: '// @ts-check',
        statement: '// @ts-ignore intentional type mismatch',
        suppressed: true,
      },
    ])(
      'preserves leading directives $pragma $statement',
      async ({ pragma, statement, suppressed }) => {
        const p = (project = await createJsonProject(jsonOnly, {
          checkJs: false,
        }))
        const source =
          '<script name="json">\n' +
          pragma +
          '\n/** @type {number} */\n' +
          statement +
          '\nconst count = "wrong"\nmodule.exports = { count, dirname: __dirname }\n</script>'
        await p.edit('index.mpx', source)
        const diagnostics = await p.service.getDiagnostics(p.uri('index.mpx'))
        expect(diagnostics.filter(d => d.code === 2322)).toHaveLength(
          suppressed ? 0 : 1,
        )
        expect(
          diagnostics.filter(d => [2304, 2454, 2578].includes(Number(d.code))),
        ).toEqual([])
      },
    )
  })
}

it('keeps ordinary script requests out of the JSON TypeScript program', async () => {
  const p = (project = await createJsonProject())
  const source =
    '<script setup lang="ts">\nconst runtimeOnly = 1\ndefineExpose({ runtimeOnly })\n</script>'
  await p.edit('runtime-only.mpx', source)
  const host = p.service.context.project.typescript!.languageServiceHost
  const original = host.getScriptFileNames
  let reads = 0
  host.getScriptFileNames = () => {
    reads++
    return original()
  }
  const uri = p.uri('runtime-only.mpx'),
    at = { line: 1, character: 8 }
  await p.service.getHover(uri, at)
  await p.service.getDefinition(uri, at)
  await p.service.getCompletionItems(uri, at)
  await p.service.getReferences(uri, at, { includeDeclaration: true })
  await p.service.getDocumentHighlights(uri, at)
  await p.service.getDiagnostics(uri)
  expect(reads).toBe(0)
  expect(
    p.service.context.plugins.find(
      ([plugin]) => plugin.name === 'mpx-json-js',
    )![0].capabilities.workspaceSymbolProvider,
  ).toBeUndefined()
  const jsonSource = p.read('index.mpx')
  const jsonPos = TextDocument.create(
    p.uri('index.mpx').toString(),
    'mpx',
    1,
    jsonSource,
  ).positionAt(jsonSource.indexOf('config.title,') + 8)
  expect(
    hoverText(await p.service.getHover(p.uri('index.mpx'), jsonPos)),
  ).toContain('string')
  expect(reads).toBeGreaterThan(0)
})

it('preserves globals introduced indirectly by a native TypeScript root', async () => {
  const path = await import('node:path')
  const p = (project = await createJsonProject())
  const entry = path
    .resolve(
      __dirname,
      '../../language-core/node_modules/@mpxjs/core/@types/index',
    )
    .replace(/\\/g, '/')
  await p.write(
    'core-environment.ts',
    'import type {} from ' + JSON.stringify(entry) + '; export {};',
  )
  const source =
    '<script name="json">module.exports = { mode: __mpx_mode__ }</script>'
  await p.edit('index.mpx', source)
  expect(
    (await p.service.getDiagnostics(p.uri('index.mpx'))).filter(
      d => d.code === 2304,
    ),
  ).toEqual([])
  expect(
    hoverText(
      await p.service.getHover(
        p.uri('index.mpx'),
        position(p, source, '__mpx_mode__'),
      ),
    ),
  ).toContain('wx')
})

it.each([true, false])(
  'keeps incomplete JSON modules isolated with legacy module detection (%s)',
  async jsonOnly => {
    const p = (project = await createJsonProject(jsonOnly, {
      module: 'CommonJS',
      moduleResolution: 'Node10',
      moduleDetection: 'legacy',
      ignoreDeprecations: '6.0',
    }))
    // These buffers deliberately omit exports while the user is editing.
    for (const file of ['one.mpx', 'two.mpx']) {
      await p.edit(
        file,
        '<script name="json">const pending = { title: "editing" }; pending.title.toUpperCase();</script>',
      )
      expect(
        (await p.service.getDiagnostics(p.uri(file))).filter(
          d => d.severity === 1,
        ),
      ).toEqual([])
    }
    const source =
      '<script name="json">module.exports = { dir: __dirname }</script>'
    await p.edit('index.mpx', source)
    expect(
      (await p.service.getDiagnostics(p.uri('index.mpx'))).filter(
        d => d.severity === 1,
      ),
    ).toEqual([])
  },
)

it('maps auto-imports around leading @ts-check without disabling its diagnostics', async () => {
  const p = (project = await createJsonProject(true, {
    allowJs: true,
    checkJs: false,
  }))
  const source =
    '<script name="json">\n// @ts-check\nconst title = jsonTitleFactory()\n/** @type {number} */\nconst count = "wrong"\nmodule.exports = { title, count }\n</script>'
  await p.edit('index.mpx', source)
  const uri = p.uri('index.mpx'),
    document = TextDocument.create(uri.toString(), 'mpx', 1, source)
  const at = document.positionAt(
    source.indexOf('jsonTitleFactory') + 'jsonTitle'.length,
  )
  const items = await p.service.getCompletionItems(uri, at)
  const item = items.items.find(item => item.label === 'jsonTitleFactory')
  expect(item).toBeTruthy()
  const resolved = await p.service.resolveCompletionItem(item!)
  expect(resolved.additionalTextEdits?.length).toBeGreaterThan(0)
  const updated = TextDocument.applyEdits(
    document,
    resolved.additionalTextEdits!,
  )
  expect(updated).toContain('require(')
  await p.edit('index.mpx', updated)
  const diagnostics = await p.service.getDiagnostics(uri)
  expect(diagnostics.filter(d => d.code === 2322)).toHaveLength(1)
  expect(diagnostics.filter(d => d.code === 2304)).toEqual([])
})

it('keeps reference-directive navigation and leading JSDoc bindings accurate', async () => {
  const p = (project = await createJsonProject())
  const source =
    '<script name="json">\n/// <reference path="./globals.d.ts" />\n"use strict";\n/** @type {{ title: string }} */\nconst config = { title: "kept" }\nmodule.exports = config\n</script>'
  await p.edit('index.mpx', source)
  const uri = p.uri('index.mpx')
  const definitions = await p.service.getDefinition(
    uri,
    position(p, source, './globals.d.ts'),
  )
  expect(definitions?.map(def => def.targetUri)).toEqual([
    p.uri('globals.d.ts').toString(),
  ])
  expect(
    (await p.service.getDiagnostics(uri)).filter(d => d.severity === 1),
  ).toEqual([])
  expect(
    hoverText(await p.service.getHover(uri, position(p, source, 'config ='))),
  ).toContain('title: string')
})

it.each([true, false])(
  'keeps injected variables out of rename while preserving user bindings (%s)',
  async jsonOnly => {
    const p = (project = await createJsonProject(jsonOnly))
    const source =
      '<script name="json">\n/** @param {string} __dirname */\nfunction local(__dirname) { return __dirname }\nmodule.exports = { directory: __dirname, label: local("x") }\n</script>'
    await p.edit('index.mpx', source)
    const uri = p.uri('index.mpx'),
      doc = TextDocument.create(uri.toString(), 'mpx', 1, source)
    const injected = doc.positionAt(
      source.indexOf('directory: __dirname') + 'directory: '.length + 1,
    )
    expect(await p.service.getRenameRange(uri, injected)).toHaveProperty(
      'message',
    )
    expect(
      await p.service.getRenameEdits(uri, injected, 'directory'),
    ).toBeUndefined()
    const shadow = doc.positionAt(
      source.indexOf('return __dirname') + 'return '.length + 1,
    )
    const edits = await p.service.getRenameEdits(uri, shadow, 'localDirectory')
    expect(edits?.changes?.[uri.toString()]?.length).toBeGreaterThanOrEqual(2)
    for (const edit of edits!.changes![uri.toString()])
      expect(doc.offsetAt(edit.range.start)).toBeLessThan(
        source.indexOf('module.exports'),
      )
  },
)

it.each([true, false])(
  'keeps leading JSDoc type declarations unique and source-backed (%s)',
  async jsonOnly => {
    const p = (project = await createJsonProject(jsonOnly))
    const source =
      '<script name="json">\n// @ts-check\n/** @typedef {{ title: string }} Config */\n/** @type {Config} */\nconst config = { title: "kept" }\nmodule.exports = { title: config.title, directory: __dirname }\n</script>'
    await p.edit('index.mpx', source)
    const uri = p.uri('index.mpx'),
      doc = TextDocument.create(uri.toString(), 'mpx', 1, source)
    expect(
      (await p.service.getDiagnostics(uri)).filter(d => d.severity === 1),
    ).toEqual([])
    const at = doc.positionAt(
      source.indexOf('@type {Config}') + '@type {'.length + 1,
    )
    const definitions = await p.service.getDefinition(uri, at)
    expect(definitions).toHaveLength(1)
    expect(doc.getText(definitions![0].targetSelectionRange)).toBe('Config')
    const renamed = await p.service.getRenameEdits(uri, at, 'JsonConfig')
    expect(renamed?.changes?.[uri.toString()]).toHaveLength(2)
  },
)

it('reports a missing reference file at the original directive once', async () => {
  const p = (project = await createJsonProject())
  const source =
    '<script name="json">\n/// <reference path="./missing-json-types.d.ts" />\nmodule.exports = {}\n</script>'
  await p.edit('index.mpx', source)
  const doc = TextDocument.create(
    p.uri('index.mpx').toString(),
    'mpx',
    1,
    source,
  )
  const errors = (await p.service.getDiagnostics(p.uri('index.mpx'))).filter(
    d => d.code === 6053,
  )
  expect(errors).toHaveLength(1)
  expect(doc.getText(errors[0].range)).toContain('missing-json-types.d.ts')
})
