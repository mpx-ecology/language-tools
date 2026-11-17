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
let source: string
let file: string
const fixture = 'numeric-tags.mpx'

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
    service.getServiceScript(fixture).root.mpxCompilerOptions,
    id => id,
  )
  source = service.read(fixture)
  file = service.file(fixture)
})
afterAll(() => service.dispose())

function componentTokens(
  span = { start: 0, length: source.length },
  relativeFile = fixture,
) {
  const content = service.read(relativeFile)
  const { spans } = proxy.getEncodedSemanticClassifications(
    service.file(relativeFile),
    span,
    ts.SemanticClassificationFormat.TwentyTwenty,
  )
  const tokens: number[][] = []
  for (let i = 0; i < spans.length; i += 3) {
    if (spans[i + 2] === 256 && spans[i] < content.indexOf('</template>'))
      tokens.push(spans.slice(i, i + 3))
  }
  return tokens.sort((a, b) => a[0] - b[0])
}

it('classifies both numeric component tags and static tag values exactly once', () => {
  const template = source.slice(0, source.indexOf('</template>'))
  const expected = [...template.matchAll(/<\/?(list[\w-]+)(?=[\s/>])/g)].map(
    match => [
      match.index + (match[0].startsWith('</') ? 2 : 1),
      match[1].length,
      256,
    ],
  )
  for (const tag of ['list-deep-1', 'list-deep-12']) {
    expected.push([template.indexOf(`"${tag}"`) + 1, tag.length, 256])
  }
  expect(componentTokens()).toEqual(expected.sort((a, b) => a[0] - b[0]))
})

it.each(['list-deep-1', 'list-deep-12', 'list-2-panel'])(
  'classifies %s when a range request intersects an opening or closing tag',
  tag => {
    const starts = [
      source.indexOf(`<${tag} `) + 1,
      source.indexOf(`</${tag}>`) + 2,
    ]
    for (const start of starts) {
      const tokens = componentTokens({ start: start + 1, length: 1 })
      expect(tokens).toEqual([[start, tag.length, 256]])
    }
  },
)

it('keeps numeric component prop hover and navigation', () => {
  const position = source.indexOf('title=', source.indexOf('<list-deep-1 ')) + 1
  const hover = proxy.getQuickInfoAtPosition(file, position)
  expect(ts.displayPartsToString(hover?.displayParts)).toContain(
    'title: string',
  )
  expect(
    proxy
      .getDefinitionAtPosition(file, position)
      ?.some(definition => definition.fileName === service.file('panel.mpx')),
  ).toBe(true)
})

const scriptFixture = 'script-registered-numeric-tags.mpx'

it('matches original script registration keys with each codegen candidate', () => {
  const content = service.read(scriptFixture)
  const template = content.slice(0, content.indexOf('</template>'))
  const registered = ['list-deep-1', 'list-deep-2', 'list-deep-3']
  const expected = [...template.matchAll(/<\/?([\w-]+)(?=[\s/>])/g)]
    .filter(match => registered.includes(match[1]))
    .map(match => [
      match.index + (match[0].startsWith('</') ? 2 : 1),
      match[1].length,
      256,
    ])
  expected.push([
    template.indexOf('"list-deep-1"') + 1,
    'list-deep-1'.length,
    256,
  ])
  expect(
    componentTokens({ start: 0, length: content.length }, scriptFixture),
  ).toEqual(expected.sort((a, b) => a[0] - b[0]))
})

it.each(['list-deep1', 'listDeep1', 'ListDeep1'])(
  'does not classify unresolved %s in opening tags, closing tags or static values',
  tag => {
    const content = service.read(scriptFixture)
    const starts = [
      content.indexOf(`<${tag} `) + 1,
      content.indexOf(`</${tag}>`) + 2,
      content.indexOf(`"${tag}"`) + 1,
    ]
    for (const start of starts) {
      expect(start).toBeGreaterThan(1)
      expect(
        componentTokens({ start: start + 1, length: 1 }, scriptFixture),
      ).toEqual([])
    }
  },
)

it('keeps prop hover and navigation for the original script registration key', () => {
  const content = service.read(scriptFixture)
  const position = content.indexOf('title=') + 1
  const scriptFile = service.file(scriptFixture)
  const hover = proxy.getQuickInfoAtPosition(scriptFile, position)
  expect(ts.displayPartsToString(hover?.displayParts)).toContain(
    'title: string',
  )
  expect(
    proxy
      .getDefinitionAtPosition(scriptFile, position)
      ?.some(definition => definition.fileName === service.file('panel.mpx')),
  ).toBe(true)
})
