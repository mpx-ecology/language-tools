import path from 'node:path'
import fs from 'node:fs'
import * as ts from 'typescript'
import type { LanguageServiceContext } from '@volar/language-service'
import type {
  Hover,
  LocationLink,
  MarkupContent,
} from 'vscode-languageserver-protocol'
import { TextDocument } from 'vscode-languageserver-textdocument'
import { URI } from 'vscode-uri'
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  type TestLanguageService,
  createTestLanguageService,
} from '../../language-core/__tests__/utils/createTestLanguageService'
import { create as createTemplateLinks } from '../src/plugins/mpx-sfc-template-links'
import { create as createComponentDefinition } from '../src/plugins/mpx-component-definition'
import { create as createJsonLinks } from '../src/plugins/mpx-sfc-json-links'
import { create as createTemplate } from '../src/plugins/mpx-sfc-template'
import { getComponentProps } from '../../typescript-plugin/src/requests/getComponentProps'
import type { IRequests } from '../../typescript-plugin/src/requests'
import {
  componentNavigationRanges,
  componentTargetsHover,
} from '../src/utils/componentNavigation'

const fixtureRoot = path.resolve(
  __dirname,
  '../../language-core/__tests__/fixtures/platform-components',
)
const token = {
  isCancellationRequested: false,
  onCancellationRequested: () => ({ dispose() {} }),
}
const services: TestLanguageService[] = []
const temporaryDirectories: string[] = []
afterEach(() => {
  for (const service of services.splice(0)) service.dispose()
  for (const directory of temporaryDirectories.splice(0))
    fs.rmSync(directory, { recursive: true, force: true })
})
function setup() {
  const service = createTestLanguageService(fixtureRoot)
  services.push(service)
  const fileName = service.file('index.mpx')
  const { root } = service.getServiceScript('index.mpx')
  const source = service.language.scripts.get(fileName)!
  const sourceUri = URI.file(fileName)
  const template = TextDocument.create(
    `${sourceUri}.__template.html`,
    'html',
    0,
    root.sfc.template!.content,
  )
  const json = TextDocument.create(
    `${sourceUri}.__json.js`,
    'javascript',
    0,
    root.sfc.json!.content,
  )
  const context = {
    decodeEmbeddedDocumentUri: (uri: URI) => [
      sourceUri,
      uri.toString() === template.uri ? 'template' : 'json_js',
    ],
    language: { scripts: { get: () => source } },
  } as unknown as LanguageServiceContext
  return { service, context, template, json }
}
const targetNames = (definitions: unknown) =>
  ((definitions as LocationLink[]) ?? [])
    .map(definition => path.basename(URI.parse(definition.targetUri).fsPath))
    .sort()

describe('platform component forward navigation', () => {
  it('refreshes application platform decorations without starting a TypeScript Program', () => {
    const directory = fs.mkdtempSync(
      path.join(path.dirname(fixtureRoot), '.platform-navigation-'),
    )
    temporaryDirectories.push(directory)
    fs.cpSync(fixtureRoot, directory, { recursive: true })
    fs.copyFileSync(
      path.join(directory, 'panel.mpx'),
      path.join(directory, 'single.mpx'),
    )
    fs.writeFileSync(
      path.join(directory, 'app.mpx'),
      `<script type="application/json">{"usingComponents":{"demo-panel":"./single"}}</script>`,
    )
    fs.writeFileSync(
      path.join(directory, 'index.mpx'),
      '<template><demo-panel /></template><script setup>defineExpose({})</script>',
    )
    const service = createTestLanguageService(directory)
    services.push(service)
    const uri = URI.file(service.file('index.mpx'))
    const getProgram = vi.spyOn(service.languageService, 'getProgram')
    const context = {
      language: {
        scripts: {
          get: (uri: URI) => service.language.scripts.get(uri.fsPath),
        },
      },
      documents: {
        get: (
          uri: URI,
          languageId: string,
          snapshot: import('typescript').IScriptSnapshot,
        ) =>
          TextDocument.create(
            uri.toString(),
            languageId,
            0,
            snapshot.getText(0, snapshot.getLength()),
          ),
      },
      project: {},
    } as unknown as LanguageServiceContext
    expect(componentNavigationRanges(context, uri)).toEqual([])
    const variant = path.join(directory, 'single.ios.mpx')
    fs.copyFileSync(path.join(directory, 'panel.ios.mpx'), variant)
    expect(componentNavigationRanges(context, uri)).toHaveLength(1)
    fs.unlinkSync(variant)
    expect(componentNavigationRanges(context, uri)).toEqual([])
    expect(getProgram).not.toHaveBeenCalled()
  })
  it('hovers source attributes with every platform type and declaration source', async () => {
    const { service, context, template } = setup()
    Object.assign(context, {
      env: { workspaceFolders: [], getConfiguration: async () => undefined },
      project: { mpx: {} },
    })
    const request = {
      typescript: ts,
      language: service.language,
      languageService: service.languageService,
      languageServiceHost: service.languageServiceHost,
      isTsPlugin: false,
      getFileId: (file: string) => file,
    }
    const plugin = createTemplate(
      () =>
        ({
          getComponentProps: async (file, tag) =>
            getComponentProps.call(request, file, tag),
        }) as IRequests,
    ).create(context)
    const hover = await plugin.provideHover!(
      template,
      template.positionAt(template.getText().indexOf('value=') + 2),
      token,
    )
    const text = JSON.stringify(hover?.contents)
    for (const type of ['string', 'number', 'false', 'true'])
      expect(text).toContain(type)
    expect(text).not.toContain('__VLS_SelfComponent')
    const tagHover = await createTemplateLinks().create(context).provideHover!(
      template,
      template.positionAt(template.getText().indexOf('demo-panel') + 1),
      token,
    )
    expectRealFileLinks(tagHover as Hover, [
      'panel.mpx',
      'panel.ios.mpx',
      'panel.ali.mpx',
    ])
  })
  it.each([
    ['template links', createTemplateLinks],
    ['component definitions', createComponentDefinition],
  ] as const)(
    '%s retains all real files and deduplicates aliases, query and closing-tag hits',
    async (_, create) => {
      const { context, template } = setup()
      const plugin = create().create!(context)!
      for (const offset of [
        template.getText().indexOf('demo-panel') + 1,
        template.getText().indexOf('</demo-panel') + 3,
      ]) {
        const definitions = await plugin.provideDefinition!(
          template,
          template.positionAt(offset),
          token,
        )
        expect(targetNames(definitions)).toEqual([
          'panel.ali.mpx',
          'panel.ios.mpx',
          'panel.mpx',
        ])
      }
    },
  )
  it('keeps all JSON definitions but leaves multi-target Ctrl/Cmd+click to the definition provider', async () => {
    const { context, json } = setup()
    const plugin = createComponentDefinition({ template: false }).create!(
      context,
    )!
    const offset = json.getText().indexOf('./panel')
    const definitions = await plugin.provideDefinition!(
      json,
      json.positionAt(offset + 2),
      token,
    )
    expect(targetNames(definitions)).toEqual([
      'panel.ali.mpx',
      'panel.ios.mpx',
      'panel.mpx',
    ])
    expect(
      (definitions as LocationLink[]).every(
        definition =>
          json.getText(definition.originSelectionRange) === './panel',
      ),
    ).toBe(true)
    const jsonPlugin = createJsonLinks().create!(context)!
    expect(await jsonPlugin.provideDiagnostics!(json, token)).toEqual([])
    const links = await jsonPlugin.provideDocumentLinks!(json, token)
    expect(
      links?.filter(link => json.getText(link.range) === './panel'),
    ).toHaveLength(0)
    expect(
      links?.filter(
        link => json.getText(link.range) === '@components/panel.mpx?root=demo',
      ),
    ).toHaveLength(0)
    const hover = await jsonPlugin.provideHover!(
      json,
      json.positionAt(offset + 2),
      token,
    )
    expect(json.getText((hover as Hover).range)).toBe('./panel')
    expectRealFileLinks(hover as Hover, [
      'panel.mpx',
      'panel.ali.mpx',
      'panel.ios.mpx',
    ])
  })
  it('uses explicit hover links for real files without overlapping template DocumentLinks', async () => {
    const { context, template } = setup()
    const plugin = createTemplateLinks().create!(context)!
    const links = await plugin.provideDocumentLinks!(template, token)
    const start = template.getText().indexOf('demo-panel')
    expect(
      links?.filter(link => template.offsetAt(link.range.start) === start),
    ).toEqual([])
    for (const offset of [
      start + 1,
      template.getText().indexOf('</demo-panel') + 3,
    ]) {
      const hover = await plugin.provideHover!(
        template,
        template.positionAt(offset),
        token,
      )
      expect(template.getText((hover as Hover).range)).toBe('demo-panel')
      expectRealFileLinks(hover as Hover, [
        'panel.mpx',
        'panel.ali.mpx',
        'panel.ios.mpx',
      ])
    }
  })
  it('keeps direct single-target links and shows the real filename instead of the request or query', async () => {
    const { context, template, json } = setup()
    for (const [document, create] of [
      [json, createJsonLinks],
      [template, createTemplateLinks],
    ] as const) {
      const plugin = create().create!(context)!
      const links = await plugin.provideDocumentLinks!(document, token)
      const link = links?.find(link =>
        document
          .getText(link.range)
          .includes(document === json ? './panel.ios.mpx?' : 'explicit-panel'),
      )
      expect(link?.tooltip).toBe('自定义组件：panel.ios.mpx')
      expect(link?.target).toBe(
        URI.file(path.join(fixtureRoot, 'panel.ios.mpx')).toString(),
      )
      expect(
        await plugin.provideHover!(document, link!.range.start, token),
      ).toBeUndefined()
    }
  })
  it('keeps explicit source-file navigation independent from resource query', async () => {
    const { context, template, json } = setup()
    const jsonProvider = createComponentDefinition().create!(context)!
    const templateProvider = createTemplateLinks().create!(context)!
    expect(
      targetNames(
        await jsonProvider.provideDefinition!(
          json,
          json.positionAt(
            json.getText().indexOf('./panel.ios.mpx?mode=ali') + 2,
          ),
          token,
        ),
      ),
    ).toEqual(['panel.ios.mpx'])
    expect(
      targetNames(
        await templateProvider.provideDefinition!(
          template,
          template.positionAt(template.getText().indexOf('explicit-panel') + 1),
          token,
        ),
      ),
    ).toEqual(['panel.ios.mpx'])
  })
})

function expectRealFileLinks(hover: Hover, files: string[]) {
  const markdown = (hover.contents as MarkupContent).value
  for (const file of files) {
    expect(markdown).toContain(
      `[${file}](<${URI.file(path.join(fixtureRoot, file)).toString()}>)`,
    )
  }
  expect(markdown.match(/^- \[/gm)).toHaveLength(files.length)
  expect(markdown).not.toContain('[./panel]')
}

it('disambiguates same-name files and escapes special characters in hover link labels', () => {
  const files = [
    '/components/a/panel.mpx',
    '/components/b/panel.mpx',
    '/components/panel[legacy].mpx',
  ]
  const hover = componentTargetsHover(
    { start: { line: 0, character: 0 }, end: { line: 0, character: 5 } },
    files,
  )
  const markdown = (hover.contents as MarkupContent).value
  expect(markdown).toContain('[/components/a/panel.mpx]')
  expect(markdown).toContain('[/components/b/panel.mpx]')
  expect(markdown).toContain('[panel\\[legacy\\].mpx]')
  for (const file of files)
    expect(markdown).toContain(`(<${URI.file(file).toString()}>)`)
})
