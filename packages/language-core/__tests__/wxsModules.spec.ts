import path from 'node:path'
import * as ts from 'typescript'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import {
  type TestLanguageService,
  createTestLanguageService,
} from './utils/createTestLanguageService'

describe('template WXS modules', () => {
  let service: TestLanguageService
  const fixture = 'index.mpx'

  beforeAll(() => {
    service = createTestLanguageService(
      path.resolve(__dirname, 'fixtures/wxs-modules'),
    )
  })
  afterAll(() => service.dispose())

  function diagnostics(relativePath: string) {
    const source = service.read(relativePath)
    return service.proxyLanguageService
      .getSemanticDiagnostics(service.file(relativePath))
      .map(({ code, start, length }) => ({
        code,
        text: source.slice(start!, start! + length!),
      }))
  }

  it('resolves declared modules and keeps real template errors', () => {
    expect(diagnostics(fixture)).toEqual([
      { code: 2339, text: 'missingTool' },
      { code: 2339, text: 'missingRows' },
      { code: 2339, text: 'invalid' },
    ])
    expect(diagnostics('other.mpx')).toEqual([
      { code: 2339, text: 'externalTool' },
    ])
  })

  it.each([
    ['@mpx-ignore', [{ code: 2339, text: 'missingAfterIgnore' }]],
    ['@mpx-skip', [{ code: 2339, text: 'missingAfterSkip' }]],
    [
      '@mpx-expect-error',
      [
        { code: 2339, text: 'missingAfterExpectError' },
        { code: 2578, text: '<!-- @mpx-expect-error -->' },
      ],
    ],
  ])('keeps %s on the WXS declaration', (_directive, expected) => {
    expect(diagnostics('directives.mpx')).toEqual(
      expect.arrayContaining(expected),
    )
  })

  it('completes module aliases, hovers, and navigates to the declaration', () => {
    const source = service.read(fixture)
    const file = service.file(fixture)
    const position = source.indexOf('listTool.getRenderList') + 2
    const language = service.proxyLanguageService

    expect(
      language
        .getCompletionsAtPosition(file, position, {})
        ?.entries.map(entry => entry.name),
    ).toEqual(expect.arrayContaining(['listTool', 'externalTool', 'rows']))

    const info = language.getQuickInfoAtPosition(file, position)
    expect(ts.displayPartsToString(info?.displayParts)).toContain('listTool')
    expect(language.getDefinitionAtPosition(file, position)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          fileName: file,
          textSpan: { start: source.indexOf("'listTool'") + 1, length: 8 },
        }),
      ]),
    )

    const shadowed = source.indexOf('listTool.title') + 2
    const localInfo = language.getQuickInfoAtPosition(file, shadowed)
    expect(ts.displayPartsToString(localInfo?.displayParts)).toContain(
      'title: string',
    )
  })
})
