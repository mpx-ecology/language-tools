import path from 'node:path'
import * as ts from 'typescript'
import { afterAll, beforeAll, expect, it } from 'vitest'
import {
  type TestLanguageService,
  createTestLanguageService,
} from './utils/createTestLanguageService'

let service: TestLanguageService

beforeAll(() => {
  service = createTestLanguageService(
    path.resolve(__dirname, 'fixtures/runtime-prop-spreads'),
  )
})
afterAll(() => service.dispose())

it('retains template prop types after an any spread', () => {
  const relativePath = 'opaque-spread.ios.mpx'
  const file = service.file(relativePath)
  const source = service.read(relativePath)
  const proxy = service.proxyLanguageService

  expect(
    proxy.getSemanticDiagnostics(file).map(diagnostic => ({
      code: diagnostic.code,
      text: source.slice(
        diagnostic.start!,
        diagnostic.start! + diagnostic.length!,
      ),
    })),
  ).toEqual([
    { code: 2339, text: 'overwritten' },
    { code: 2339, text: 'undeclared' },
  ])

  const expectedTypes = {
    vehicleClass: 'string',
    label: 'string',
    message: 'string | number',
    shown: 'boolean',
  }
  for (const [name, type] of Object.entries(expectedTypes)) {
    const position = source.indexOf(name)
    const hover = proxy.getQuickInfoAtPosition(file, position)
    expect(ts.displayPartsToString(hover?.displayParts)).toContain(
      `${name}: ${type}`,
    )
  }

  const name = 'vehicleClass'
  expect(proxy.getDefinitionAtPosition(file, source.indexOf(name))).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        fileName: file,
        textSpan: { start: source.indexOf(`${name}:`), length: name.length },
      }),
    ]),
  )
})

it('preserves inference for ordinary typed spreads', () => {
  const relativePath = 'typed-spread.mpx'
  const file = service.file(relativePath)
  const position = service.read(relativePath).indexOf('caption')
  expect(service.proxyLanguageService.getSemanticDiagnostics(file)).toEqual([])
  const hover = service.proxyLanguageService.getQuickInfoAtPosition(
    file,
    position,
  )
  expect(ts.displayPartsToString(hover?.displayParts)).toBe(
    '(property) caption: number',
  )
})
