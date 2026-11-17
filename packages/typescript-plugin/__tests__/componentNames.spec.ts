import path from 'node:path'
import * as ts from 'typescript'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import {
  type TestLanguageService,
  createTestLanguageService,
} from '../../language-core/__tests__/utils/createTestLanguageService'
import { proxyLanguageServiceForMpx } from '../src/common'
import { getComponentNames } from '../src/requests/getComponentNames'
import { getComponentProps } from '../src/requests/getComponentProps'
import type { RequestContext } from '../src/requests/types'

let service: TestLanguageService
let proxy: ts.LanguageService
let context: RequestContext
const names = ['list-deep-1', 'list-deep1', 'listDeep1']
const panels = ['kebab-panel.mpx', 'compact-panel.mpx', 'camel-panel.mpx']
const types = ['string', 'number', 'boolean']

beforeAll(() => {
  service = createTestLanguageService(
    path.resolve(
      __dirname,
      '../../language-core/__tests__/fixtures/exact-component-names',
    ),
  )
  context = {
    typescript: ts,
    language: service.language,
    languageService: service.languageService,
    languageServiceHost: service.languageServiceHost,
    isTsPlugin: false,
    getFileId: id => id,
  }
  proxy = proxyLanguageServiceForMpx(
    ts,
    service.language,
    service.proxyLanguageService,
    service.getServiceScript('json.mpx').root.mpxCompilerOptions,
    id => id,
  )
})
afterAll(() => service.dispose())

function tokens(file: string, span?: ts.TextSpan) {
  const source = service.read(file)
  const { spans } = proxy.getEncodedSemanticClassifications(
    service.file(file),
    span ?? { start: 0, length: source.length },
    ts.SemanticClassificationFormat.TwentyTwenty,
  )
  const result: number[][] = []
  for (let i = 0; i < spans.length; i += 3) {
    if (spans[i + 2] === 256 && spans[i] < source.indexOf('</template>'))
      result.push(spans.slice(i, i + 3))
  }
  return result.sort((a, b) => a[0] - b[0])
}

describe.each(['json', 'script'])(
  'exact %s component registration names',
  kind => {
    const file = `${kind}.mpx`

    it('exposes original registry keys and highlights only registered spellings', () => {
      expect(proxy.getSyntacticDiagnostics(service.file(file))).toEqual([])
      expect(
        getComponentNames.call(context, service.file(file))?.sort(),
      ).toEqual([...names].sort())
      const source = service.read(file)
      const template = source.slice(0, source.indexOf('</template>'))
      const expected = [
        ...template.matchAll(/<\/?(list[\w-]+)(?=[\s/>])/g),
      ].map(match => [
        match.index + (match[0].startsWith('</') ? 2 : 1),
        match[1].length,
        256,
      ])
      for (const name of names)
        expected.push([template.indexOf(`"${name}"`) + 1, name.length, 256])
      expect(tokens(file)).toEqual(expected.sort((a, b) => a[0] - b[0]))
    })

    it.each(names)(
      'keeps %s props, hover and definition separate from similar names',
      name => {
        const index = names.indexOf(name)
        const source = service.read(file)
        const position =
          source.indexOf('value=', source.indexOf(`<${name} `)) + 1
        const props = getComponentProps.call(context, service.file(file), name)!
        expect(
          props.map(prop => ({ name: prop.name, type: prop.type })),
        ).toEqual([
          {
            name: 'value',
            type: `${index === 2 ? 'false | true' : types[index]} | undefined`,
          },
        ])
        const hover = ts.displayPartsToString(
          proxy.getQuickInfoAtPosition(service.file(file), position)
            ?.displayParts,
        )
        expect(hover).toContain(`value?: ${types[index]} | undefined`)
        const definitions = proxy.getDefinitionAtPosition(
          service.file(file),
          position,
        )
        expect([
          ...new Set(definitions?.map(def => path.basename(def.fileName))),
        ]).toEqual([panels[index]])
      },
    )

    it('reports each wrong prop type against its own component', () => {
      const source = service.read(file)
      const errors = proxy
        .getSemanticDiagnostics(service.file(file))
        .filter(
          d => d.code === 2322 && d.start! < source.indexOf('</template>'),
        )
      expect(errors).toHaveLength(3)
      expect(
        errors.map(d => source.slice(d.start!, d.start! + d.length!)),
      ).toEqual(['value', 'value', 'value'])
      expect(
        errors.map(d => ts.flattenDiagnosticMessageText(d.messageText, '\n')),
      ).toEqual([
        expect.stringContaining("type 'string'"),
        expect.stringContaining("type 'number'"),
        expect.stringContaining("type 'boolean | undefined'"),
      ])
    })

    it('does not borrow props, hover or navigation for an unregistered spelling', () => {
      const single = `single-${kind}.mpx`
      const source = service.read(single)
      for (const name of ['list-deep1', 'listDeep1', 'ListDeep1']) {
        expect(
          getComponentProps.call(context, service.file(single), name),
        ).toEqual([])
        const position =
          source.indexOf('value=', source.indexOf(`<${name} `)) + 1
        const hover = ts.displayPartsToString(
          proxy.getQuickInfoAtPosition(service.file(single), position)
            ?.displayParts,
        )
        expect(hover).not.toContain('value?: string')
        expect(
          proxy
            .getDefinitionAtPosition(service.file(single), position)
            ?.some(def => def.fileName === service.file('kebab-panel.mpx')),
        ).not.toBe(true)
        for (const start of [
          source.indexOf(`<${name} `) + 1,
          source.indexOf(`</${name}>`) + 2,
          source.indexOf(`"${name}"`) + 1,
        ])
          expect(tokens(single, { start: start + 1, length: 1 })).toEqual([])
      }
    })
  },
)

it('keeps component references on exact registration names', () => {
  for (let i = 0; i < names.length; i++) {
    const references = proxy
      .getFileReferences(service.file(panels[i]))
      .filter(reference => reference.fileName === service.file('json.mpx'))
      .map(reference =>
        service
          .read('json.mpx')
          .slice(
            reference.textSpan.start,
            reference.textSpan.start + reference.textSpan.length,
          ),
      )
    expect(references).toContain(names[i])
    for (const other of [
      ...names.filter(name => name !== names[i]),
      'ListDeep1',
    ])
      expect(references).not.toContain(other)
  }
})
