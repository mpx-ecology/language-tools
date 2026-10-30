import path from 'node:path'
import type { VirtualCode } from '@volar/language-core'
import * as CompilerDOM from '@vue/compiler-dom'
import * as ts from 'typescript'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { createTemplateCodegenContext } from '../src/codegen/template/context'
import { collectStyleScopedClassReferences } from '../src/codegen/template/styleScopedClasses'
import type { TemplateCodegenOptions } from '../src/codegen/template'
import {
  type TestLanguageService,
  createTestLanguageService,
} from './utils/createTestLanguageService'

describe('dynamic template class links', () => {
  let service: TestLanguageService
  let source: string
  let fileName: string

  beforeAll(() => {
    service = createTestLanguageService(
      path.resolve(__dirname, 'fixtures/dynamic-class-links'),
    )
    source = service.read('index.mpx')
    fileName = service.file('index.mpx')
  })

  afterAll(() => service.dispose())

  it.each([
    'static-class',
    'is-solo',
    'active',
    'computed-class',
    'string-class',
    'array-class',
    'nested-class',
    'logical-class',
    'true-class',
    'false-class',
    'base-class',
    'interpolated-class',
    'tail-class',
    'length-class',
  ])('navigates %s only to its style selector', className => {
    const definitions = service.proxyLanguageService.getDefinitionAtPosition(
      fileName,
      source.indexOf(className) + 1,
    )
    expect(definitions).toHaveLength(1)
    expect(definitions![0].fileName).toBe(fileName)
    expect(definitions![0].textSpan).toEqual({
      start: source.indexOf(`.${className}`),
      length: className.length + 1,
    })
  })

  it.each(["{ 'is-': enabled }", "{ '': enabled }"])(
    'completes class names inside %s',
    marker => {
      const position = source.indexOf(marker) + marker.indexOf("'") + 1
      const completions = service.proxyLanguageService.getCompletionsAtPosition(
        fileName,
        position,
        {},
      )
      expect(completions?.entries.map(entry => entry.name)).toEqual(
        expect.arrayContaining(['is-solo', 'array-class']),
      )
    },
  )

  it('preserves static empty-class completions', () => {
    const position = source.indexOf('class=""') + 'class="'.length
    const completions = service.proxyLanguageService.getCompletionsAtPosition(
      fileName,
      position,
      {},
    )
    expect(completions?.entries.map(entry => entry.name)).toContain('is-solo')
  })

  it('keeps class condition navigation and hover on the script variable', () => {
    const position = source.indexOf('!titleText') + 2
    const definitions = service.proxyLanguageService.getDefinitionAtPosition(
      fileName,
      position,
    )
    expect(definitions).toHaveLength(1)
    expect(definitions![0].textSpan.start).toBeGreaterThan(
      source.indexOf('<script'),
    )
    expect(
      ts.displayPartsToString(
        service.proxyLanguageService.getQuickInfoAtPosition(fileName, position)
          ?.displayParts,
      ),
    ).toBe('(property) titleText: "hello"')
  })

  it('keeps typed member completions on class-condition variables', () => {
    const position = source.indexOf('titleText.length') + 'titleText.'.length
    const completions = service.proxyLanguageService.getCompletionsAtPosition(
      fileName,
      position,
      {},
    )
    expect(completions?.entries.map(entry => entry.name)).toEqual(
      expect.arrayContaining(['length', 'toUpperCase']),
    )
    expect(completions?.entries.map(entry => entry.name)).not.toContain(
      'is-solo',
    )
  })

  it('keeps verification and semantic mappings separate from class navigation', () => {
    const { root } = service.getServiceScript('index.mpx')
    const script = findEmbeddedCode(root, 'script_ts')!
    const classPosition = source.indexOf('is-solo') + 1
    const mappings = script.mappings.filter(mapping =>
      mapping.sourceOffsets.some(
        (offset, index) =>
          offset <= classPosition &&
          classPosition < offset + mapping.lengths[index],
      ),
    )
    expect(mappings.filter(mapping => mapping.data.semantic)).toHaveLength(1)
    expect(
      mappings.some(
        mapping =>
          mapping.data.verification &&
          mapping.data.semantic &&
          !mapping.data.navigation,
      ),
    ).toBe(true)
    expect(
      mappings.some(
        mapping =>
          mapping.data.navigation &&
          !mapping.data.verification &&
          !mapping.data.semantic,
      ),
    ).toBe(true)
  })

  it('preserves each intentional type error exactly once', () => {
    const diagnostics = service.proxyLanguageService.getSemanticDiagnostics(
      service.file('errors.mpx'),
    )
    expect(
      diagnostics.map(diagnostic =>
        ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n'),
      ),
    ).toEqual([
      "Property 'toFixed' does not exist on type '\"hello\"'. Did you mean 'fixed'?",
      "Property 'missingCondition' does not exist on type '{ titleText: \"hello\"; }'.",
    ])
  })

  it.each(['dynamicClass', 'computedKey'])(
    'keeps runtime %s navigation on its script definition',
    name => {
      const relativePath = 'dynamic-values.mpx'
      const dynamicSource = service.read(relativePath)
      const definitions = service.proxyLanguageService.getDefinitionAtPosition(
        service.file(relativePath),
        dynamicSource.indexOf(name) + 1,
      )
      expect(definitions).toHaveLength(1)
      expect(definitions![0].textSpan.start).toBeGreaterThan(
        dynamicSource.indexOf('<script'),
      )
      expect(definitions![0].textSpan.start).toBeLessThan(
        dynamicSource.indexOf('<style'),
      )
    },
  )

  it('keeps an identically named ordinary object key navigating in non-class expressions', () => {
    const relativePath = 'dynamic-values.mpx'
    const dynamicSource = service.read(relativePath)
    const keyStart =
      dynamicSource.indexOf("Boolean({ 'value-class'") + 'Boolean({ '.length
    const definitions = service.proxyLanguageService.getDefinitionAtPosition(
      service.file(relativePath),
      keyStart + 2,
    )
    expect(definitions?.map(definition => definition.textSpan)).toEqual([
      {
        start: keyStart,
        length: "'value-class'".length,
      },
    ])
  })

  it('preserves both meanings of a shorthand class key', () => {
    const relativePath = 'dynamic-values.mpx'
    const dynamicSource = service.read(relativePath)
    const position = dynamicSource.indexOf('{ enabled }') + 3
    const definitions = service.proxyLanguageService.getDefinitionAtPosition(
      service.file(relativePath),
      position,
    )
    expect(definitions).toHaveLength(2)
    expect(
      definitions?.some(
        definition =>
          definition.textSpan.start === dynamicSource.indexOf('.enabled'),
      ),
    ).toBe(true)
    expect(
      definitions?.some(
        definition =>
          definition.textSpan.start > dynamicSource.indexOf('<script') &&
          definition.textSpan.start < dynamicSource.indexOf('<style'),
      ),
    ).toBe(true)
  })

  it('keeps class ranges after an escaped literal aligned to source text', () => {
    const relativePath = 'dynamic-values.mpx'
    const dynamicSource = service.read(relativePath)
    for (const className of ['before-class', 'after-class']) {
      const definitions = service.proxyLanguageService.getDefinitionAtPosition(
        service.file(relativePath),
        dynamicSource.indexOf(className) + 1,
      )
      expect(definitions?.map(definition => definition.textSpan)).toEqual([
        {
          start: dynamicSource.indexOf(`.${className}`),
          length: className.length + 1,
        },
      ])
    }
    const { code } = service.getServiceScript(relativePath)
    for (const className of [
      'argument-class',
      'prefix-',
      'value-only',
      'escaped-class',
    ]) {
      expect(code).not.toContain(`__VLS_StyleScopedClasses['${className}']`)
    }
    expect(code).toContain("__VLS_StyleScopedClasses['value-class']")
  })

  it('keeps valid dynamic classes free of new diagnostics', () => {
    expect(
      service.proxyLanguageService.getSemanticDiagnostics(fileName),
    ).toEqual([])
  })

  it('does not apply wx:class object/array normalization to ordinary class or mixed text', () => {
    const relativePath = 'unsupported-class-values.mpx'
    const invalidSource = service.read(relativePath)
    const { code } = service.getServiceScript(relativePath)
    for (const name of [
      'object-class',
      'array-only-class',
      'mixed-object-class',
    ]) {
      expect(code).not.toContain(`__VLS_StyleScopedClasses['${name}']`)
    }
    const definitions = service.proxyLanguageService.getDefinitionAtPosition(
      service.file(relativePath),
      invalidSource.indexOf('object-class') + 1,
    )
    expect(definitions?.map(definition => definition.textSpan)).toEqual([
      {
        start: invalidSource.indexOf("'object-class'"),
        length: "'object-class'".length,
      },
    ])
  })

  it('does not navigate concatenated class fragments to an unrelated whole selector', () => {
    const relativePath = 'unsupported-class-values.mpx'
    const concatenatedSource = service.read(relativePath)
    const template = concatenatedSource.slice(
      0,
      concatenatedSource.indexOf('<script'),
    )
    const styleStart = concatenatedSource.indexOf('<style')
    for (const match of template.matchAll(/'(?:active|inactive)'/g)) {
      const definitions = service.proxyLanguageService.getDefinitionAtPosition(
        service.file(relativePath),
        match.index + 2,
      )
      expect(
        definitions?.some(
          definition => definition.textSpan.start > styleStart,
        ) ?? false,
      ).toBe(false)
    }
    const { code } = service.getServiceScript(relativePath)
    expect(code).not.toContain("__VLS_StyleScopedClasses['active']")
    expect(code).not.toContain("__VLS_StyleScopedClasses['inactive']")
  })
})

describe('class source ranges', () => {
  it('preserves raw static classes and UTF-16 offsets inside mixed Mustache values', () => {
    const template = String.raw`<view class="前缀 😀 before {{ enabled ? '中文-class' : 'a\u002db' }} after escaped\:class" />`
    const element = CompilerDOM.parse(template)
      .children[0] as CompilerDOM.ElementNode
    const ctx = createTemplateCodegenContext({
      scriptSetupBindingNames: new Set(),
    })
    collectStyleScopedClassReferences(
      { ts } as TemplateCodegenOptions,
      ctx,
      element,
    )
    expect(ctx.scopedClasses.map(reference => reference.className)).toEqual([
      '前缀',
      '😀',
      'before',
      'after',
      'escaped\\:class',
      '中文-class',
    ])
    for (const reference of ctx.scopedClasses) {
      expect(
        template.slice(
          reference.offset,
          reference.offset + reference.className.length,
        ),
      ).toBe(reference.className)
      expect(reference.offset).toBe(template.indexOf(reference.className))
    }
  })

  it('collects only class-producing branches, not conditions or arbitrary string arguments', () => {
    const template = [
      '<view wx:class="',
      "{{ [flag ? 'yes' : 'no', flag && 'and', variable || 'or', variable ?? 'fallback', `fixed-template`, 'prefix' + value, getClass('argument'), { ['computed']: 'value', [variable]: flag }] }}",
      '" />',
    ].join('')
    const element = CompilerDOM.parse(template)
      .children[0] as CompilerDOM.ElementNode
    const ctx = createTemplateCodegenContext({
      scriptSetupBindingNames: new Set(),
    })
    collectStyleScopedClassReferences(
      { ts } as TemplateCodegenOptions,
      ctx,
      element,
    )
    expect(ctx.scopedClasses.map(reference => reference.className)).toEqual([
      'yes',
      'no',
      'and',
      'or',
      'fallback',
      'fixed-template',
      'computed',
    ])
  })
})

function findEmbeddedCode(
  code: VirtualCode,
  id: string,
): VirtualCode | undefined {
  if (code.id === id) {
    return code
  }
  for (const child of code.embeddedCodes ?? []) {
    const found = findEmbeddedCode(child, id)
    if (found) {
      return found
    }
  }
}
