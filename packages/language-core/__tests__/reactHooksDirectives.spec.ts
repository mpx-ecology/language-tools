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

  it('maps an unused @ts-expect-error back to the directive', () => {
    const text = source
      .replace('// @ts-ignore', '// @ts-expect-error')
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
  })

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

  it('keeps the call and callback mapped to their original source positions', () => {
    service.updateFile(fixture, source)
    const fileName = service.file(fixture)
    const sourceScript = service.language.scripts.get(fileName)!
    const { languagePlugin, root } = sourceScript.generated!
    const { code } = languagePlugin.typescript!.getServiceScript(root)!
    const map = service.language.maps.get(code, sourceScript)

    const call = source.lastIndexOf('onReactHooksExec')
    const parameter = source.indexOf('props:')
    const propertyUse = source.indexOf('props.enabled')
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
    const templateField = source.indexOf('hookFlag')
    const hover = proxy.getQuickInfoAtPosition(fileName, templateField + 1)
    expect(ts.displayPartsToString(hover?.displayParts)).toContain(
      'hookFlag: boolean',
    )
  })
})
