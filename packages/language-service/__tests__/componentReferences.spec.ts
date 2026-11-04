import path from 'node:path'
import * as ts from 'typescript'
import { afterAll, describe, expect, it } from 'vitest'
import { URI } from 'vscode-uri'
import { createLanguageService, createUriMap } from '@volar/language-service'
import { createLanguageServiceHost } from '@volar/typescript'
import {
  createLanguage,
  createMpxLanguagePlugin,
} from '../../language-core/src'
import { createTestLanguageService } from '../../language-core/__tests__/utils/createTestLanguageService'
import { create as createTypeScriptSemanticPlugin } from '../src/plugins/typescript-semantic'
import { create as createComponentReferences } from '../src/plugins/mpx-component-references'
import { create as createTemplateLinks } from '../src/plugins/mpx-sfc-template-links'
import { create as createComponentDefinition } from '../src/plugins/mpx-component-definition'

const fixtureRoot = path.resolve(
  __dirname,
  '../../language-core/__tests__/fixtures/component-references',
)
const fixture = createTestLanguageService(fixtureRoot)
const compilerOptions = fixture.languageServiceHost.getCompilationSettings()
const mpxOptions = fixture.getServiceScript('first.mpx').root.mpxCompilerOptions
let revision = 0
const edits = new Map<string, ts.IScriptSnapshot>()
const language = createLanguage<URI>(
  [createMpxLanguagePlugin(ts, compilerOptions, mpxOptions, uri => uri.fsPath)],
  createUriMap(),
  uri => {
    const snapshot =
      edits.get(uri.fsPath) ??
      (uri.fsPath.endsWith('.mpx')
        ? fixture.language.scripts.get(uri.fsPath)?.snapshot
        : fixture.languageServiceHost.getScriptSnapshot(uri.fsPath))
    if (snapshot)
      language.scripts.set(
        uri,
        snapshot,
        uri.fsPath.endsWith('.mpx') ? 'mpx' : 'typescript',
      )
  },
)
const { languageServiceHost, getExtraServiceScript } =
  createLanguageServiceHost(
    ts,
    ts.sys,
    language,
    fileName => URI.file(fileName),
    {
      getCurrentDirectory: () => fixtureRoot,
      getProjectVersion: () => String(revision),
      getCompilationSettings: () => compilerOptions,
      getScriptFileNames: () =>
        fixture.languageServiceHost.getScriptFileNames(),
    },
  )
const service = createLanguageService(
  language,
  [
    createTemplateLinks(),
    createComponentReferences(ts),
    createComponentDefinition(),
    createTypeScriptSemanticPlugin(ts, { disableAutoImportCache: true }),
  ],
  { workspaceFolders: [URI.file(fixtureRoot)] },
  {
    typescript: {
      configFileName: path.join(fixtureRoot, 'tsconfig.json'),
      sys: ts.sys,
      languageServiceHost,
      getExtraServiceScript,
      uriConverter: {
        asUri: (fileName: string) => URI.file(fileName),
        asFileName: (uri: URI) => uri.fsPath,
      },
    },
  },
)
const uri = (file: string) => URI.file(fixture.file(file))
function position(file: string, text: string) {
  const doc = service.context.documents.get(
    uri(file),
    'mpx',
    language.scripts.get(uri(file))!.snapshot,
  )
  return doc.positionAt(doc.getText().indexOf(text) + 1)
}
afterAll(() => {
  service.dispose()
  fixture.dispose()
})

describe('component navigation through real TS and LSP', () => {
  it('already navigates template tags and JSON paths to the resolved component', async () => {
    for (const text of [
      'demo-panel',
      '/demo-panel',
      'PanelAlias',
      './panel.mpx',
      '@/panel.mpx',
    ]) {
      const definitions = await service.getDefinition(
        uri('first.mpx'),
        position('first.mpx', text),
      )
      expect([...new Set(definitions?.map(d => d.targetUri))]).toEqual([
        uri('panel.mpx').toString(),
      ])
    }
  })
  it('finds exact template and registration source ranges from the component file', async () => {
    const references = await service.getFileReferences(uri('panel.mpx'))
    expect(
      references
        ?.filter(r => r.uri === uri('first.mpx').toString())
        .map(r => {
          const document = service.context.documents.get(
            uri('first.mpx'),
            'mpx',
            language.scripts.get(uri('first.mpx'))!.snapshot,
          )
          return document.getText(r.range)
        })
        .sort(),
    ).toEqual(
      [
        './panel.mpx',
        '@/panel.mpx?root=demo',
        'PanelAlias',
        'demo-panel',
        'demo-panel',
      ].sort(),
    )
    expect(
      references?.some(r => r.uri === uri('unrelated.mpx').toString()),
    ).toBe(false)
    expect(new Set(references?.map(r => JSON.stringify(r))).size).toBe(
      references?.length,
    )
  })
  it.each([
    'demo-panel',
    '/demo-panel',
    'PanelAlias',
    './panel.mpx',
    '@/panel.mpx',
  ])('joins all consumers from %s through LSP', async text => {
    const references = await service.getReferences(
      uri('first.mpx'),
      position('first.mpx', text),
      { includeDeclaration: false },
    )
    expect(references).toEqual(
      await service.getFileReferences(uri('panel.mpx')),
    )
  })
  it('invalidates unsaved consumer edits without changing on-disk fixtures', async () => {
    const original = fixture.read('second.mpx')
    const update = (text: string) => {
      edits.set(fixture.file('second.mpx'), ts.ScriptSnapshot.fromString(text))
      revision++
    }
    try {
      expect(
        (await service.getFileReferences(uri('panel.mpx')))?.some(
          r => r.uri === uri('second.mpx').toString(),
        ),
      ).toBe(true)
      update(original.replace('./panel', './other.mpx'))
      expect(
        (await service.getFileReferences(uri('panel.mpx')))?.some(
          r => r.uri === uri('second.mpx').toString(),
        ),
      ).toBe(false)
      expect(
        (await service.getFileReferences(uri('other.mpx')))?.filter(
          r => r.uri === uri('second.mpx').toString(),
        ),
      ).toHaveLength(2)
      update(original.replace('other-name />', 'other-name></other-name>'))
      expect(
        (await service.getFileReferences(uri('panel.mpx')))?.filter(
          r => r.uri === uri('second.mpx').toString(),
        ),
      ).toHaveLength(3)
    } finally {
      update(original)
    }
  })
})
