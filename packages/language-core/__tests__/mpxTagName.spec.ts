import path from 'node:path'
import * as ts from 'typescript'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { forEachEmbeddedCode } from '@volar/language-core'
import {
  nativeComponentNames,
  nativeComponentsTypesContents,
  tsCodegen,
} from '../src'
import { compileMpxSource } from './utils/compileMpxFixture'
import {
  type TestLanguageService,
  createTestLanguageService,
} from './utils/createTestLanguageService'

export const fixtureRoot = path.resolve(__dirname, 'fixtures/mpx-tag-name')
let service: TestLanguageService
beforeAll(() => {
  service = createTestLanguageService(fixtureRoot)
})
afterAll(() => service.dispose())

function diagnostics(file: string) {
  return service.proxyLanguageService.getSemanticDiagnostics(service.file(file))
}

describe('mpxTagName effective identities', () => {
  it('checks native and custom props at their original attribute ranges', () => {
    const source = service.read('index.mpx')
    const errors = diagnostics('index.mpx')
    expect(errors.map(d => d.code)).toEqual([2322, 2322])
    expect(
      errors.map(d => source.slice(d.start!, d.start! + d.length!)),
    ).toEqual(['maxlength', 'title'])
    expect(
      errors.map(d => ts.flattenDiagnosticMessageText(d.messageText, '\n')),
    ).toEqual([
      "Type 'string' is not assignable to type 'number'.",
      "Type 'number' is not assignable to type 'string'.",
    ])
    expect(diagnostics('valid.mpx')).toEqual([])
  })

  it('locates missing required props on the tag value and honors diagnostic directives', () => {
    const source = service.read('required.mpx')
    const errors = diagnostics('required.mpx')
    expect(errors.map(error => error.code)).toEqual([2345])
    expect(
      source.slice(errors[0].start!, errors[0].start! + errors[0].length!),
    ).toBe('tag-panel')
    expect(diagnostics('suppressed.mpx')).toEqual([])
  })

  it('keeps the native identity registry consistent with native prop types', () => {
    const file = ts.createSourceFile(
      'native.d.ts',
      nativeComponentsTypesContents,
      ts.ScriptTarget.Latest,
      true,
    )
    const declaration = file.statements.find(
      node =>
        ts.isInterfaceDeclaration(node) &&
        node.name.text === 'NativeComponentAttrs',
    ) as ts.InterfaceDeclaration
    expect([...nativeComponentNames].sort()).toEqual(
      declaration.members
        .map(member => (member.name as ts.Identifier | ts.StringLiteral).text)
        .sort(),
    )
  })

  it('resolves tag replacement before treating slot or template wrappers specially', () => {
    expect(
      diagnostics('wrappers.mpx').map(diagnostic => diagnostic.code),
    ).toEqual([2322, 2322])
  })

  it('checks event handlers on the replacement native tag', () => {
    const errors = diagnostics('events.mpx')
    expect(errors.map(d => d.code)).toEqual([2322, 2322])
    expect(
      ts.flattenDiagnosticMessageText(errors[0].messageText, '\n'),
    ).toContain('EventHandler')
  })

  it('preserves props hover types and navigation through the TS plugin mappings', () => {
    const source = service.read('index.mpx')
    const file = service.file('index.mpx')
    const title = source.indexOf(' title=') + 2
    expect(
      ts.displayPartsToString(
        service.proxyLanguageService.getQuickInfoAtPosition(file, title)
          ?.displayParts,
      ),
    ).toContain('title: string')
    const definitions = service.proxyLanguageService.getDefinitionAtPosition(
      file,
      title,
    )
    expect(
      definitions?.some(
        d =>
          d.fileName === service.file('panel.mpx') &&
          service
            .read('panel.mpx')
            .slice(d.textSpan.start, d.textSpan.start + d.textSpan.length) ===
            'title',
      ),
    ).toBe(true)
    const maxlength = source.indexOf('maxlength') + 1
    expect(
      ts.displayPartsToString(
        service.proxyLanguageService.getQuickInfoAtPosition(file, maxlength)
          ?.displayParts,
      ),
    ).toContain('number')
  })

  it('records value identities separately from the unchanged open/close parser tags', () => {
    const { root } = service.getServiceScript('index.mpx')
    const text = root.sfc.template!.content
    const tags = tsCodegen.get(root.sfc)!.getGeneratedTemplate()!
      .templateNodeTags
    expect(tags.map(t => t.name)).toEqual(['input', 'tag-panel'])
    for (const identity of tags) {
      expect(
        text.slice(
          identity.startTagOffset,
          identity.startTagOffset + identity.name.length,
        ),
      ).toBe(identity.name)
      expect(identity.endTagOffset).toBeUndefined()
      expect(
        text.slice(
          identity.sourceTag!.startTagOffset,
          identity.sourceTag!.startTagOffset + 4,
        ),
      ).toBe('view')
      expect(
        text.slice(
          identity.sourceTag!.endTagOffset!,
          identity.sourceTag!.endTagOffset! + 4,
        ),
      ).toBe('view')
    }
    const nodes = root.sfc.template!.ast!.children.filter(n => n.type === 1)
    expect(nodes.map(n => n.tag)).toEqual(['view', 'view'])
  })

  it('maps semantic tokens only to the actual values and retains navigation separately', () => {
    const { root } = service.getServiceScript('index.mpx')
    const template = root.sfc.template!
    const script = [...forEachEmbeddedCode(root)].find(
      code => code.id === 'script_ts',
    )!
    const source = service.read('index.mpx')
    for (const name of ['input', 'tag-panel']) {
      const start = source.indexOf(`"${name}"`) + 1
      const mappings = script.mappings.filter(m =>
        m.sourceOffsets.some(
          (offset, i) => offset <= start && start < offset + m.lengths[i],
        ),
      )
      const semantic = mappings.filter(m => m.data.semantic === true)
      expect(semantic).toHaveLength(1)
      expect(mappings.some(m => m.data.navigation)).toBe(true)
      expect(mappings.some(m => m.data.verification)).toBe(true)
      const tag = tsCodegen
        .get(root.sfc)!
        .getGeneratedTemplate()!
        .templateNodeTags.find(tag => tag.name === name)!
      expect(start).toBe(template.startTagEnd + tag.startTagOffset)
    }
    const tokens =
      service.proxyLanguageService.getEncodedSemanticClassifications(
        service.file('index.mpx'),
        { start: 0, length: source.length },
        ts.SemanticClassificationFormat.TwentyTwenty,
      ).spans
    const ranges = []
    for (let i = 0; i < tokens.length; i += 3)
      ranges.push(source.slice(tokens[i], tokens[i] + tokens[i + 1]))
    expect(ranges).toEqual(expect.arrayContaining(['input', 'tag-panel']))
  })

  it('keeps conditional candidates, unconditional precedence and dynamic boundaries', () => {
    const { root } = service.getServiceScript('platforms.mpx')
    const tags = tsCodegen.get(root.sfc)!.getGeneratedTemplate()!
      .templateNodeTags
    expect(tags.map(tag => [tag.name, tag.condition])).toEqual([
      ['view', undefined],
      ['input', 'swan'],
      ['view', undefined],
      ['tag-panel', 'ios|android'],
      ['input', undefined],
      ['view', undefined],
      ['view', undefined],
      ['view', undefined],
    ])
    const errors = diagnostics('platforms.mpx')
    expect(errors.map(d => d.code)).toEqual([2322, 2322, 2322])
  })

  it('checks hyphenated native tags and avoids repeated shared-expression mappings', () => {
    const { root } = service.getServiceScript('shared.mpx')
    const source = service.read('shared.mpx')
    const script = [...forEachEmbeddedCode(root)].find(
      code => code.id === 'script_ts',
    )!
    for (const name of ['lengthLimit', 'caption']) {
      const start = source.indexOf(`{{ ${name}`) + 3
      const mappings = script.mappings.filter(m =>
        m.sourceOffsets.some(
          (offset, i) => offset <= start && start < offset + m.lengths[i],
        ),
      )
      expect(mappings.filter(m => m.data.semantic === true)).toHaveLength(1)
      expect(mappings.some(m => m.data.navigation)).toBe(true)
    }
    expect(
      tsCodegen
        .get(root.sfc)!
        .getGeneratedTemplate()!
        .scopedClasses.filter(c => c.className === 'box'),
    ).toHaveLength(1)
    expect(diagnostics('shared.mpx').map(d => d.code)).toEqual([2322])
  })

  it('resolves overlapping conditions, node guards, environments and empty unconditional values', () => {
    const { root } = service.getServiceScript('overlap.mpx')
    const tags = tsCodegen.get(root.sfc)!.getGeneratedTemplate()!
      .templateNodeTags
    expect(tags.map(tag => [tag.name, tag.condition])).toEqual([
      ['view', undefined],
      ['input', 'swan'],
      ['tag-panel', '(swan|ali)'],
      ['tag-panel', 'ios|android'],
      ['view', undefined],
      ['view', undefined],
      ['tag-panel', ':demo'],
    ])
    expect(diagnostics('overlap.mpx')).toEqual([])
  })

  it('updates value identity and offsets after an edit without rewriting raw tags', () => {
    const file = service.file('valid.mpx')
    const source = service.read('valid.mpx')
    const next = source.replace('mpxTagName="input"', 'mpxTagName="textarea"')
    const { root } = service.getServiceScript('valid.mpx')
    root.update(ts.ScriptSnapshot.fromString(next))
    const tags = tsCodegen.get(root.sfc)!.getGeneratedTemplate()!
      .templateNodeTags
    expect(tags[0].name).toBe('textarea')
    expect(
      root.sfc.template!.content.slice(
        tags[1].startTagOffset,
        tags[1].startTagOffset + tags[1].name.length,
      ),
    ).toBe('tag-panel')
    service.language.scripts.set(
      file,
      ts.ScriptSnapshot.fromString(source),
      'mpx',
    )
  })
})

describe('real Mpx compiler semantics', () => {
  it.each(['wx', 'swan', 'ios', 'android'])(
    'selects the matching literal on %s',
    async mode => {
      const source =
        '<template><view mpxTagName@swan="input" mpxTagName@ios|android="text">Mpx</view></template><script setup>defineExpose({})</script>'
      const output = await compileMpxSource(
        source,
        path.join(fixtureRoot, 'compiler.mpx'),
        mode,
      )
      expect(output.wxml).toContain(
        `<${mode === 'swan' ? 'input' : mode === 'wx' ? 'view' : 'mpx-text'}`,
      )
      expect(output.wxml).not.toContain('mpxTagName')
    },
  )
  it.each([
    ['swan', 'input'],
    ['ali', 'textarea'],
  ])(
    'uses the first matching overlapping condition on %s',
    async (mode, expected) => {
      const source =
        '<template><view mpxTagName@swan="input" mpxTagName@(swan|ali)="textarea" /></template><script setup>defineExpose({})</script>'
      const output = await compileMpxSource(
        source,
        path.join(fixtureRoot, 'compiler.mpx'),
        mode,
      )
      expect(output.wxml).toContain(`<${expected}`)
    },
  )
  it.each(['slot', 'template'])(
    'replaces a %s wrapper before compiler special handling',
    async wrapper => {
      const source = `<template><${wrapper} mpxTagName="input" /></template><script setup>defineExpose({})</script>`
      const output = await compileMpxSource(
        source,
        path.join(fixtureRoot, 'compiler.mpx'),
      )
      expect(output.wxml).toContain('<input')
    },
  )
  it('prefers unconditional values, independent of source order', async () => {
    for (const attributes of [
      'mpxTagName="text" mpxTagName@swan="input"',
      'mpxTagName@swan="input" mpxTagName="text"',
    ]) {
      const source = `<template><view ${attributes}>Mpx</view></template><script setup>defineExpose({})</script>`
      expect(
        (
          await compileMpxSource(
            source,
            path.join(fixtureRoot, 'compiler.mpx'),
            'swan',
          )
        ).wxml,
      ).toContain('<text')
    }
  })
})
