import type { RequestContext } from '../../typescript-plugin/src/requests/types'
import { getComponentProps } from '../../typescript-plugin/src/requests/getComponentProps'
import type { VirtualCode } from '@volar/language-core'
import * as ts from 'typescript'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import {
  type TestLanguageService,
  createTestLanguageService,
} from './utils/createTestLanguageService'

describe('typed custom component props', () => {
  let service: TestLanguageService
  let requestContext: RequestContext

  beforeAll(() => {
    service = createTestLanguageService()
    requestContext = {
      typescript: ts,
      language: service.language,
      languageService: service.languageService,
      languageServiceHost: service.languageServiceHost,
      isTsPlugin: false,
      getFileId: fileName => fileName,
    }
  })

  afterAll(() => {
    service.dispose()
  })

  it('extracts runtime Props types and JSDoc', () => {
    const props = getProps('index.mpx', 'component-options')

    expect(props.get('shortText')).toMatchObject({
      type: 'string | undefined',
      deprecated: true,
    })
    expect(props.get('shortText')?.commentMarkdown).toContain('旧版简短文案。')
    expect(props.get('parentText')).toMatchObject({
      type: 'string | undefined',
    })
    expect(props.get('parentText')?.commentMarkdown).toContain(
      "*@default* 'hello'",
    )
    expect(props.get('name')?.type).toBe('number | undefined')
    expect(props.get('profile')?.type).toBe('UserProfile | undefined')
    expect(props.get('theme')).toMatchObject({
      type: '"light" | "dark" | undefined',
      values: ['light', 'dark'],
    })
  })

  it('reports invalid normal and platform-specific prop values', () => {
    const allDiagnostics = service.proxyLanguageService.getSemanticDiagnostics(
      service.file('index.mpx'),
    )
    const diagnostics = allDiagnostics
      .filter(diagnostic => diagnostic.code === 2322)
      .map(diagnostic => diagnosticMessage(diagnostic))

    expect(diagnostics).toHaveLength(10)
    expect(diagnostics).toContain(
      "Type 'number' is not assignable to type 'string'.",
    )
    expect(diagnostics).toContain(
      "Type 'string' is not assignable to type 'number'.",
    )
    expect(diagnostics).toContain(
      "Type 'string' is not assignable to type 'UserProfile'.",
    )
    expect(
      allDiagnostics.filter(diagnostic =>
        [1117, 2353].includes(diagnostic.code),
      ),
    ).toEqual([])
  })

  it('keeps nested object prop completions typed', () => {
    const relativePath = 'index.mpx'
    const source = service.read(relativePath)
    const marker = 'profile="{{ {  } }}"'
    const position = source.indexOf(marker) + marker.indexOf('{  }') + 2
    const completions =
      service.proxyLanguageService.getCompletionsAtPosition(
        service.file(relativePath),
        position,
        {},
      )?.entries ?? []

    expect(completions.map(entry => entry.name)).toEqual(
      expect.arrayContaining(['id', 'name']),
    )
  })

  it('keeps setup returns typed from runtime props without duplicate semantics', () => {
    const relativePath = 'component-setup-props.mpx'
    const fileName = service.file(relativePath)
    const source = service.read(relativePath)
    const diagnostics = service.proxyLanguageService
      .getSemanticDiagnostics(fileName)
      .filter(diagnostic => diagnostic.code === 2339)

    expect(
      diagnostics.map(diagnostic => diagnosticMessage(diagnostic)),
    ).toEqual([
      "Property 'no_exist' does not exist on type 'Foo'.",
      "Property 'no_exist' does not exist on type 'Foo'.",
      "Property 'no_exist' does not exist on type 'MixedFoo'.",
      "Property 'no_exist' does not exist on type 'MixedFoo'.",
    ])

    const incorrectPosition = source.indexOf('incorrect.no_exist') + 1
    const incorrectInfo = service.proxyLanguageService.getQuickInfoAtPosition(
      fileName,
      incorrectPosition,
    )
    expect(displayPartsToString(incorrectInfo?.displayParts)).toBe(
      '(property) incorrect: Foo',
    )

    const mixedIncorrectPosition = source.indexOf('mixedIncorrect.no_exist') + 1
    const mixedIncorrectInfo =
      service.proxyLanguageService.getQuickInfoAtPosition(
        fileName,
        mixedIncorrectPosition,
      )
    expect(displayPartsToString(mixedIncorrectInfo?.displayParts)).toBe(
      '(property) mixedIncorrect: MixedFoo',
    )

    const mixedPropPosition =
      source.indexOf('props.mixed') + 'props.'.length + 1
    const mixedPropInfo = service.proxyLanguageService.getQuickInfoAtPosition(
      fileName,
      mixedPropPosition,
    )
    expect(displayPartsToString(mixedPropInfo?.displayParts)).toBe(
      '(property) mixed: MixedFoo',
    )

    const propsPosition = source.indexOf('props.correct') + 1
    const propsInfo = service.proxyLanguageService.getQuickInfoAtPosition(
      fileName,
      propsPosition,
    )
    const propsDisplay = displayPartsToString(propsInfo?.displayParts)
    expect(propsDisplay).toContain('(parameter) props: GetPropsType<')
    expect(propsDisplay).not.toContain('(parameter) props: any')

    const { root } = service.getServiceScript(relativePath)
    const scriptCode = findEmbeddedCode(root, 'script_ts')
    const semanticMappings = scriptCode?.mappings.flatMap(mapping =>
      mapping.sourceOffsets.flatMap((sourceOffset, index) => {
        const length = mapping.lengths[index]
        return sourceOffset <= propsPosition &&
          propsPosition < sourceOffset + length &&
          mapping.data.semantic
          ? [mapping]
          : []
      }),
    )
    expect(semanticMappings).toHaveLength(1)
  })

  it('keeps extensionless directory component Props typed', () => {
    const props = getProps('index.mpx', 'component-index')

    expect(props.get('directoryCount')?.type).toBe('number | undefined')
  })

  it('infers plain JavaScript component Props when allowJs/checkJs are enabled', () => {
    const props = getProps('index.mpx', 'component-options-js')

    expect(props.get('jsText')?.type).toBe('string | undefined')
  })

  it('merges Props from multiple component candidates', () => {
    const props = getProps(
      'multiple-component-candidates.mpx',
      'multi-candidate',
    )

    expect(props.get('value')?.type).toBe('string | number | undefined')
    expect(props.get('optionsText')?.type).toBe('string | undefined')
    expect(props.get('setupCount')?.type).toBe('number | undefined')

    const diagnostics = service.proxyLanguageService
      .getSemanticDiagnostics(service.file('multiple-component-candidates.mpx'))
      .filter(diagnostic => diagnostic.code === 2322)
      .map(diagnostic => diagnosticMessage(diagnostic))
    expect(diagnostics).toEqual([
      "Type 'true' is not assignable to type 'string | number | undefined'.",
    ])
  })

  it('preserves non-conflicting template fields and their definitions', () => {
    const relativePath = 'component-options-inference-conflict.mpx'
    const fileName = service.file(relativePath)
    const source = service.read(relativePath)
    const templateOffset = source.indexOf('stableText.toUpperCase')
    const position = templateOffset + 1

    const quickInfo = service.proxyLanguageService.getQuickInfoAtPosition(
      fileName,
      position,
    )
    expect(displayPartsToString(quickInfo?.displayParts)).toBe(
      '(property) stableText: string',
    )

    const definitions = service.proxyLanguageService.getDefinitionAtPosition(
      fileName,
      position,
    )
    expect(definitions).toHaveLength(1)
    expect(definitions?.[0]?.fileName).toBe(fileName)
    expect(
      source.slice(
        definitions![0].textSpan.start,
        definitions![0].textSpan.start + definitions![0].textSpan.length,
      ),
    ).toBe('stableText')
    expect(definitions![0].textSpan.start).toBeGreaterThan(
      source.indexOf('properties:'),
    )

    const conflictDiagnostics = service.proxyLanguageService
      .getSemanticDiagnostics(fileName)
      .filter(diagnostic => diagnostic.code === 2339)
      .map(diagnostic =>
        ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n'),
      )
    expect(conflictDiagnostics).toEqual([
      "Property 'toFixed' does not exist on type 'never'.",
    ])
  })

  function getProps(relativePath: string, tag: string) {
    const props =
      getComponentProps.call(requestContext, service.file(relativePath), tag) ??
      []
    return new Map(props.map(prop => [prop.name, prop]))
  }
})

function displayPartsToString(parts: ts.SymbolDisplayPart[] | undefined) {
  return parts?.map(part => part.text).join('')
}

function diagnosticMessage(diagnostic: ts.Diagnostic) {
  return ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n')
}

function findEmbeddedCode(
  root: VirtualCode,
  id: string,
): VirtualCode | undefined {
  for (const code of root.embeddedCodes ?? []) {
    if (code.id === id) {
      return code
    }
    const nested = findEmbeddedCode(code, id)
    if (nested) {
      return nested
    }
  }
}
