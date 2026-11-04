import path from 'node:path'
import * as ts from 'typescript'
import { afterAll, describe, expect, it } from 'vitest'
import { compileMpxFixture } from './utils/compileMpxFixture'
import { createTestLanguageService } from './utils/createTestLanguageService'
import { getComponentNames } from '../../typescript-plugin/src/requests/getComponentNames'
import { getComponentProps } from '../../typescript-plugin/src/requests/getComponentProps'
import type { RequestContext } from '../../typescript-plugin/src/requests/types'

const root = path.resolve(__dirname, 'fixtures/registered-components')
const service = createTestLanguageService(root, [
  path.join(root, 'globals.d.ts'),
])
const context: RequestContext = {
  typescript: ts,
  language: service.language,
  languageService: service.languageService,
  languageServiceHost: service.languageServiceHost,
  isTsPlugin: false,
  getFileId: id => id,
}
afterAll(() => service.dispose())

describe('registered component sources', () => {
  it('inherits application components alongside local and typed registrations', () => {
    expect(
      getComponentNames.call(context, service.file('app-a/pages/index.mpx')),
    ).toEqual(expect.arrayContaining(['AppPanel', 'LocalPanel', 'TypedPanel']))
  })
  it('retains prop types from each registration source', () => {
    expect(
      getComponentProps.call(
        context,
        service.file('app-a/pages/index.mpx'),
        'app-panel',
      ),
    ).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: 'title', type: 'string' }),
      ]),
    )
  })
})

it('does not suggest context fields, other applications, unregistered files, or implicit self tags', () => {
  const names = getComponentNames.call(
    context,
    service.file('app-a/pages/index.mpx'),
  )!
  for (const name of ['privateField', 'OtherPanel', 'Unused', 'Index'])
    expect(names).not.toContain(name)
  expect(
    getComponentNames.call(context, service.file('app-b/pages/index.mpx')),
  ).toContain('OtherPanel')
})

it('preserves public ref types for application-registered components', () => {
  const file = service.file('app-a/pages/index.mpx')
  const original = service.read('app-a/pages/index.mpx')
  const source = `<template><app-panel wx:ref="panel" title="valid" /></template>
<script setup lang="ts">
const { refs } = useContext()
const result = refs.panel?.title
refs.panel?.title.toFixed()
defineExpose({})
</script>`
  try {
    service.updateFile('app-a/pages/index.mpx', source)
    const info = service.proxyLanguageService.getQuickInfoAtPosition(
      file,
      source.indexOf('result') + 1,
    )
    expect(ts.displayPartsToString(info?.displayParts)).toBe(
      'const result: string | undefined',
    )
    const diagnostics =
      service.proxyLanguageService.getSemanticDiagnostics(file)
    expect(diagnostics.map(diagnostic => diagnostic.code)).toEqual([2551])
    expect(
      source.slice(
        diagnostics[0].start!,
        diagnostics[0].start! + diagnostics[0].length!,
      ),
    ).toBe('toFixed')
  } finally {
    service.updateFile('app-a/pages/index.mpx', original)
  }
})

it('inherits the host app through packages entries without leaking package development globals', () => {
  const names = getComponentNames.call(
    context,
    service.file('app-a/sub/pages/index.mpx'),
  )!
  expect(names).toContain('AppPanel')
  expect(names).not.toContain('PackageOnly')
})

it('lets a local normalized alias override application and type registrations', () => {
  const file = service.file('app-a/pages/override.mpx')
  const props = getComponentProps.call(context, file, 'app-panel')
  expect(props!.map(prop => prop.name)).toEqual(['count'])
  const { root } = service.getServiceScript('app-a/pages/override.mpx')
  expect([...root.sfc.usingComponents!.keys()]).toEqual(['AppPanel'])
  expect(
    service.proxyLanguageService
      .getSemanticDiagnostics(file)
      .filter(d => d.code === 2322),
  ).toHaveLength(1)
})

it('checks and hovers application and typed props without losing their definitions', () => {
  const file = service.file('app-a/pages/index.mpx')
  const source = service.read('app-a/pages/index.mpx')
  expect(
    service.proxyLanguageService
      .getSemanticDiagnostics(file)
      .filter(d => d.code === 2322),
  ).toHaveLength(2)
  for (const tag of ['app-panel', 'TypedPanel']) {
    const offset = source.indexOf('title=', source.indexOf(`<${tag}`)) + 1
    const info = service.proxyLanguageService.getQuickInfoAtPosition(
      file,
      offset,
    )
    expect(ts.displayPartsToString(info?.displayParts)).toContain(
      'title: string',
    )
    const definitions = service.proxyLanguageService.getDefinitionAtPosition(
      file,
      offset,
    )
    expect(
      definitions?.some(
        def => def.fileName === service.file('app-a/panel.mpx'),
      ),
    ).toBe(true)
  }
})

it('refreshes registration edits, closed buffers and deleted apps; rediscovers recreated entries on page update', () => {
  const overrides = new Map<string, string | undefined>()
  const live = createTestLanguageService(
    root,
    [path.join(root, 'globals.d.ts')],
    overrides,
  )
  const request = {
    ...context,
    language: live.language,
    languageService: live.languageService,
    languageServiceHost: live.languageServiceHost,
  }
  const app = live.file('app-a/app.mpx')
  const page = live.file('app-a/pages/index.mpx')
  try {
    const names = () => getComponentNames.call(request, page)!
    expect(names()).toContain('AppPanel')
    const edited = live
      .read('app-a/app.mpx')
      .replace('app-panel', 'renamed-panel')
      .replace('./panel.mpx', './local.mpx')
    overrides.set(app, edited)
    live.language.scripts.set(app, ts.ScriptSnapshot.fromString(edited), 'mpx')
    expect(names()).toContain('RenamedPanel')
    // AppPanel remains a valid project-wide type declaration, while JSON source changes.
    expect([
      ...live
        .getServiceScript('app-a/pages/index.mpx')
        .root.sfc.usingComponents!.keys(),
    ]).not.toContain('app-panel')
    expect(
      getComponentProps
        .call(request, page, 'renamed-panel')!
        .map(prop => prop.name),
    ).toEqual(['count'])
    overrides.delete(app)
    live.language.scripts.set(
      app,
      ts.ScriptSnapshot.fromString(live.read('app-a/app.mpx')),
      'mpx',
    )
    expect(names()).not.toContain('RenamedPanel')
    expect([
      ...live
        .getServiceScript('app-a/pages/index.mpx')
        .root.sfc.usingComponents!.keys(),
    ]).toContain('app-panel')
    overrides.set(app, undefined)
    live.language.scripts.delete(app)
    expect([
      ...live
        .getServiceScript('app-a/pages/index.mpx')
        .root.sfc.usingComponents!.keys(),
    ]).not.toContain('app-panel')
    overrides.delete(app)
    live.language.scripts.set(
      app,
      ts.ScriptSnapshot.fromString(live.read('app-a/app.mpx')),
      'mpx',
    )
    // Volar drops associations to deleted sources. A new entry is discovered
    // when the page next updates (or the project is restarted).
    const pageContent = live.read('app-a/pages/index.mpx') + '\n'
    overrides.set(page, pageContent)
    live.language.scripts.set(
      page,
      ts.ScriptSnapshot.fromString(pageContent),
      'mpx',
    )
    expect([
      ...live
        .getServiceScript('app-a/pages/index.mpx')
        .root.sfc.usingComponents!.keys(),
    ]).toContain('app-panel')
  } finally {
    live.dispose()
  }
})

it('keeps JSON candidates precise when the core package has no GlobalComponents export', () => {
  const withoutTypes = createTestLanguageService(root)
  try {
    const request = {
      ...context,
      language: withoutTypes.language,
      languageService: withoutTypes.languageService,
      languageServiceHost: withoutTypes.languageServiceHost,
    }
    expect(
      getComponentNames.call(
        request,
        withoutTypes.file('app-a/pages/index.mpx'),
      ),
    ).toEqual(['AppPanel', 'LocalPanel'])
  } finally {
    withoutTypes.dispose()
  }
})

it.each([
  'app-a/panel.mpx',
  'app-a/local.mpx',
  'app-a/pages/index.mpx',
  'app-b/panel.mpx',
])('keeps %s valid for the published Mpx compiler', async file => {
  await expect(compileMpxFixture(path.join(root, file))).resolves.toBeDefined()
})

it('refreshes GlobalComponents declarations without editing the page or application', () => {
  const overrides = new Map<string, string | undefined>()
  const live = createTestLanguageService(
    root,
    [path.join(root, 'globals.d.ts')],
    overrides,
  )
  const request = {
    ...context,
    language: live.language,
    languageService: live.languageService,
    languageServiceHost: live.languageServiceHost,
  }
  const page = live.file('app-a/pages/index.mpx')
  try {
    expect(
      getComponentProps
        .call(request, page, 'TypedPanel')!
        .map(prop => prop.name),
    ).toEqual(['title'])
    overrides.set(
      live.file('globals.d.ts'),
      live
        .read('globals.d.ts')
        .replace(
          'TypedPanel: typeof TypedPanel',
          'TypedPanel: new (props: { updated: number }) => {}\n    AddedPanel: typeof TypedPanel',
        ),
    )
    expect(
      getComponentProps
        .call(request, page, 'TypedPanel')!
        .map(prop => prop.name),
    ).toEqual(['updated'])
    expect(getComponentNames.call(request, page)).toContain('AddedPanel')
    expect(
      getComponentProps
        .call(request, page, 'app-panel')!
        .map(prop => prop.name),
    ).toEqual(['title'])
  } finally {
    live.dispose()
  }
})
