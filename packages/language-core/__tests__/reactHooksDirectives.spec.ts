import path from 'node:path'
import * as ts from 'typescript'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import {
  type TestLanguageService,
  createTestLanguageService,
} from './utils/createTestLanguageService'

const fixtureRoot = path.resolve(__dirname, 'fixtures/react-hooks-directives')
const fixture = 'index.ios.mpx'

describe('onReactHooksExec TypeScript directives', () => {
  let service: TestLanguageService
  let source: string

  beforeAll(() => {
    service = createTestLanguageService(fixtureRoot)
    source = service.read(fixture)
  })
  afterAll(() => service.dispose())

  it.each([
    ['// @ts-ignore', []],
    ['// @ts-expect-error', []],
    ['', [2345]],
  ] as const)('keeps the diagnostic behavior for %j', (directive, expected) => {
    const text = source.replace('// @ts-ignore', directive)
    service.updateFile(fixture, text)

    const diagnostics = service.proxyLanguageService.getSemanticDiagnostics(
      service.file(fixture),
    )
    expect(diagnostics.map(diagnostic => diagnostic.code)).toEqual(expected)
  })

  it.each([
    ['a statement with a semicolon', '\n\nconst sentinel = 0; // @ts-ignore'],
    [
      'a statement without a semicolon',
      '\n\nconst sentinel = 0 // @ts-expect-error',
    ],
    ['an import', ' // @ts-expect-error'],
    [
      'a statement with a block directive',
      '\n\nconst sentinel = 0 /*\n@ts-ignore */',
    ],
  ])('honors a directive trailing %s', (_label, precedingText) => {
    service.updateFile(
      fixture,
      source.replace('\n\n// @ts-ignore', precedingText),
    )
    const fileName = service.file(fixture)
    expect(
      service.proxyLanguageService
        .getSyntacticDiagnostics(fileName)
        .map(diagnostic => diagnostic.code),
    ).toEqual([])
    expect(
      service.proxyLanguageService
        .getSemanticDiagnostics(fileName)
        .map(diagnostic => diagnostic.code),
    ).toEqual([])
  })

  it('reports an error on the line containing the trailing directive', () => {
    const text = source.replace(
      '// @ts-ignore',
      'const sentinel: boolean = 1; // @ts-expect-error',
    )
    service.updateFile(fixture, text)

    const diagnostics = service.proxyLanguageService.getSemanticDiagnostics(
      service.file(fixture),
    )
    expect(
      diagnostics.map(({ code, start, length }) => ({ code, start, length })),
    ).toEqual([
      {
        code: 2322,
        start: text.indexOf('sentinel'),
        length: 'sentinel'.length,
      },
    ])
  })

  it.each(['', 'const sentinel = 0; '])(
    'maps an unused @ts-expect-error with prefix %j back to the directive',
    prefix => {
      const text = source
        .replace('// @ts-ignore', prefix + '// @ts-expect-error')
        .replace('(props: { enabled: boolean })', '()')
        .replace('props.enabled', 'true')
      service.updateFile(fixture, text)

      expect(
        service.proxyLanguageService.getSemanticDiagnostics(
          service.file(fixture),
        ),
      ).toMatchObject([
        {
          code: 2578,
          start: text.indexOf('// @ts-expect-error'),
          length: '// @ts-expect-error'.length,
        },
      ])
    },
  )

  it('reports errors in the next statement separately', () => {
    service.updateFile(
      fixture,
      source.replace('</script>', 'const next: boolean = 1\n</script>'),
    )

    expect(
      service.proxyLanguageService
        .getSemanticDiagnostics(service.file(fixture))
        .map(diagnostic => diagnostic.code),
    ).toEqual([2322])
  })

  it.each(['', 'const sentinel = 0; '])(
    'maps the call and callback with prefix %j to their original positions',
    prefix => {
      const text = source.replace('// @ts-ignore', prefix + '// @ts-ignore')
      service.updateFile(fixture, text)
      const fileName = service.file(fixture)
      const sourceScript = service.language.scripts.get(fileName)!
      const { languagePlugin, root } = sourceScript.generated!
      const { code } = languagePlugin.typescript!.getServiceScript(root)!
      const map = service.language.maps.get(code, sourceScript)

      const call = text.lastIndexOf('onReactHooksExec')
      const parameter = text.indexOf('props:')
      const propertyUse = text.indexOf('props.enabled')
      for (const [offset, verification] of [
        [call, true],
        [parameter, false],
        [propertyUse, false],
      ] as const) {
        const locations = [...map.toGeneratedLocation(offset + 1)]
        expect(locations).toHaveLength(1)
        const [[generated, mapping]] = locations
        expect([...map.toSourceLocation(generated)][0][0]).toBe(offset + 1)
        expect(mapping.data).toMatchObject({
          verification,
          completion: true,
          semantic: true,
          navigation: true,
        })
      }

      const proxy = service.proxyLanguageService
      expect(proxy.getDefinitionAtPosition(fileName, call + 1)).toMatchObject([
        { fileName: service.file('hooks.d.ts') },
      ])
      expect(
        proxy.getDefinitionAtPosition(fileName, propertyUse + 1),
      ).toMatchObject([
        { fileName, textSpan: { start: parameter, length: 'props'.length } },
      ])
      const templateField = text.indexOf('hookFlag')
      const hover = proxy.getQuickInfoAtPosition(fileName, templateField + 1)
      expect(ts.displayPartsToString(hover?.displayParts)).toContain(
        'hookFlag: boolean',
      )
    },
  )
})
