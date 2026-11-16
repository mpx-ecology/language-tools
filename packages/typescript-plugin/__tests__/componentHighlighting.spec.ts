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

function componentTokens(span = { start: 0, length: source.length }) {
  const { spans } = proxy.getEncodedSemanticClassifications(
    file,
    span,
    ts.SemanticClassificationFormat.TwentyTwenty,
  )
  const tokens: number[][] = []
  for (let i = 0; i < spans.length; i += 3) {
    if (spans[i + 2] === 256 && spans[i] < source.indexOf('</template>'))
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
