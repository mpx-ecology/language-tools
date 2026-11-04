import path from 'node:path'
import * as ts from 'typescript'
import { afterAll, beforeAll, expect, it } from 'vitest'
import {
  type TestLanguageService,
  createTestLanguageService,
} from '../../language-core/__tests__/utils/createTestLanguageService'
import { proxyLanguageServiceForMpx } from '../src/common'

let service: TestLanguageService
let proxy: ts.LanguageService
beforeAll(() => {
  service = createTestLanguageService(
    path.resolve(
      __dirname,
      '../../language-core/__tests__/fixtures/mpx-tag-name',
    ),
  )
  proxy = proxyLanguageServiceForMpx(
    ts,
    service.language,
    service.proxyLanguageService,
    service.getServiceScript('index.mpx').root.mpxCompilerOptions,
    id => id,
  )
})
afterAll(() => service.dispose())

it('classifies effective custom tag values once as components, including partial requests', () => {
  const source = service.read('valid.mpx')
  const file = service.file('valid.mpx')
  const start = source.indexOf("'tag-panel'") + 1
  for (const span of [
    { start: 0, length: source.length },
    { start, length: 9 },
  ]) {
    const result = proxy.getEncodedSemanticClassifications(
      file,
      span,
      ts.SemanticClassificationFormat.TwentyTwenty,
    )
    const matching = []
    for (let i = 0; i < result.spans.length; i += 3) {
      if (result.spans[i] === start) matching.push(result.spans.slice(i, i + 3))
    }
    expect(matching).toEqual([[start, 9, 256]])
  }
})

it('preserves original tag navigation while using the effective component props', () => {
  const source = service.read('index.mpx')
  const file = service.file('index.mpx')
  const title = source.indexOf(' title=') + 2
  expect(
    ts.displayPartsToString(
      proxy.getQuickInfoAtPosition(file, title)?.displayParts,
    ),
  ).toContain('string')
  expect(
    proxy
      .getDefinitionAndBoundSpan(file, title)
      ?.definitions?.some(d => d.fileName === service.file('panel.mpx')),
  ).toBe(true)
})

it('deduplicates identical candidate diagnostics while retaining distinct messages', () => {
  const file = service.file('shared-errors.mpx')
  const raw = service.proxyLanguageService.getSemanticDiagnostics(file)
  expect(raw.filter(d => d.code === 2322)).toHaveLength(2)
  expect(
    proxy.getSemanticDiagnostics(file).filter(d => d.code === 2322),
  ).toHaveLength(1)
  expect(
    proxy.getSemanticDiagnostics(file)[0].relatedInformation?.length,
  ).toBeGreaterThanOrEqual(raw[0].relatedInformation?.length ?? 0)
  const distinct = { ...raw[0], messageText: 'Different platform type' }
  const custom = proxyLanguageServiceForMpx(
    ts,
    service.language,
    {
      ...service.proxyLanguageService,
      getSemanticDiagnostics: () => [...raw, distinct],
    },
    service.getServiceScript('shared-errors.mpx').root.mpxCompilerOptions,
    id => id,
  )
  expect(custom.getSemanticDiagnostics(file)).toHaveLength(2)
})
