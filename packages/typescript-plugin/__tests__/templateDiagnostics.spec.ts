import path from 'node:path'
import * as ts from 'typescript'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import {
  type TestLanguageService,
  createTestLanguageService,
} from '../../language-core/__tests__/utils/createTestLanguageService'
import { compileMpxFixture } from '../../language-core/__tests__/utils/compileMpxFixture'
import { withDiagnosticLocale } from '../../language-core/__tests__/utils/withDiagnosticLocale'
import { formatTemplateDiagnosticMessage } from '../../language-core/src'
import { proxyLanguageServiceForMpx } from '../src/common'
import { transformTemplateDiagnostic } from '../src/utils/diagnostics'

const fixtureRoot = path.resolve(
  __dirname,
  '../../language-core/__tests__/fixtures/template-diagnostics',
)

describe('template diagnostic messages', () => {
  let service: TestLanguageService
  let proxy: ts.LanguageService
  let fileName: string
  let source: string

  beforeAll(() => {
    service = createTestLanguageService(fixtureRoot, [
      path.join(fixtureRoot, 'control.ts.fixture'),
    ])
    proxy = proxyLanguageServiceForMpx(
      ts,
      service.language,
      service.proxyLanguageService,
      service.getServiceScript('index.mpx').root.mpxCompilerOptions,
      id => id,
    )
    fileName = service.file('index.mpx')
    source = service.read('index.mpx')
  })
  afterAll(() => service.dispose())

  it('restores source expressions without changing diagnostic metadata or cached results', () => {
    const original =
      service.proxyLanguageService.getSemanticDiagnostics(fileName)
    const before = original.map(d =>
      ts.flattenDiagnosticMessageText(d.messageText, '\n'),
    )
    const result = proxy.getSemanticDiagnostics(fileName)
    expect(result).toHaveLength(original.length)
    const expressions = [
      ['optionalUser', 18048, 'undefined'],
      ['nullableUser', 18047, 'null'],
      ['nullishUser', 18049, 'null'],
      ['unknownValue', 18046, 'unknown'],
      ['unknownItems[selectedIndex]', 2571, 'unknown'],
      ["userMap['__MPX_ctx.name']", 2532, 'undefined'],
      ['user.__MPX_ctx', 18048, 'undefined'],
    ] as const
    for (const [expression, code, type] of expressions) {
      const start = source.indexOf(expression)
      const diagnostic = result.find(d => d.start === start)!
      expect(diagnostic, expression).toBeDefined()
      expect(diagnostic.code).toBe(code)
      const message = ts.flattenDiagnosticMessageText(
        diagnostic.messageText,
        '\n',
      )
      expect(message).toContain(type)
      expect(message).not.toContain('__MPX_ctx.__MPX_ctx')
      const raw = original.find(d => d.start === start)!
      expect({ ...diagnostic, messageText: raw.messageText }).toEqual(raw)
      if (before[original.indexOf(raw)].includes('__MPX_ctx.')) {
        expect(message).toContain(`'${expression}'`)
      }
    }
    expect(
      original.map(d => ts.flattenDiagnosticMessageText(d.messageText, '\n')),
    ).toEqual(before)
    expect(result.filter(d => d.start! > source.indexOf('<script'))).toEqual(
      original.filter(d => d.start! > source.indexOf('<script')),
    )
    expect(
      result.some(
        d =>
          d.start! >= source.indexOf('<view wx:if') &&
          d.start! < source.indexOf('</template>'),
      ),
    ).toBe(false)
  })

  it('leaves ordinary TypeScript identifiers and literal types unchanged', () => {
    const fileName = service.file('control.ts.fixture')
    const original =
      service.proxyLanguageService.getSemanticDiagnostics(fileName)
    expect(
      original.some(d =>
        ts
          .flattenDiagnosticMessageText(d.messageText, '\n')
          .includes('__MPX_ctx.user'),
      ),
    ).toBe(true)
    expect(proxy.getSemanticDiagnostics(fileName)).toEqual(original)
  })

  it('preserves real TS2339 literal types containing quoted context-like names', () => {
    const fileName = service.file('literal-types.mpx')
    const source = service.read('literal-types.mpx')
    const original =
      service.proxyLanguageService.getSemanticDiagnostics(fileName)
    expect(original.map(d => d.code)).toEqual([2339, 2339])
    expect(
      original.map(d => source.slice(d.start!, d.start! + d.length!)),
    ).toEqual(['missing', 'missing'])
    expect(
      ts.flattenDiagnosticMessageText(original[0].messageText, '\n'),
    ).toContain("'__MPX_ctx.missing'")
    expect(
      ts.flattenDiagnosticMessageText(original[1].messageText, '\n'),
    ).toContain("'__MPX_dollars.missing'")
    expect(proxy.getSemanticDiagnostics(fileName)).toEqual(original)
  })

  it.each(['en', 'zh-cn'] as const)(
    'restores real %s TS18049 diagnostics without changing metadata or suppression',
    locale =>
      withDiagnosticLocale(locale, () => {
        const local = createTestLanguageService(fixtureRoot)
        try {
          const proxy = proxyLanguageServiceForMpx(
            ts,
            local.language,
            local.proxyLanguageService,
            local.getServiceScript('index.mpx').root.mpxCompilerOptions,
            id => id,
          )
          for (const relativePath of ['index.mpx', 'directives.mpx']) {
            const fileName = local.file(relativePath)
            const before =
              local.proxyLanguageService.getSemanticDiagnostics(fileName)
            const result = proxy.getSemanticDiagnostics(fileName)
            expect(result).toHaveLength(before.length)
            result.forEach((diagnostic, index) =>
              expect({
                ...diagnostic,
                messageText: before[index].messageText,
              }).toEqual(before[index]),
            )
            if (relativePath === 'index.mpx') {
              const raw = before.find(d => d.code === 18049)!
              const diagnostic = result.find(d => d.code === 18049)!
              const message = ts.flattenDiagnosticMessageText(
                diagnostic.messageText,
                '\n',
              )
              expect(message).toBe(
                ts
                  .flattenDiagnosticMessageText(raw.messageText, '\n')
                  .replace('__MPX_ctx.nullishUser', 'nullishUser'),
              )
              if (locale === 'zh-cn')
                expect(message).toMatch(/^nullishUser可能为/)
            } else {
              expect(result.map(d => d.code)).toEqual([18048, 2578])
            }
          }
        } finally {
          local.dispose()
        }
      }),
  )

  it('formats nested diagnostic chains and template related information without mutating them', () => {
    const original = service.proxyLanguageService
      .getSemanticDiagnostics(fileName)
      .find(d => d.start === source.indexOf('optionalUser'))!
    const diagnostic: ts.Diagnostic = {
      ...original,
      messageText: {
        category: original.category,
        code: original.code,
        messageText: 'Outer message',
        next: [
          {
            category: original.category,
            code: original.code,
            messageText: "'__MPX_ctx.optionalUser' is possibly 'undefined'.",
          },
        ],
      },
      relatedInformation: [
        {
          ...original,
          messageText: "'__MPX_ctx.optionalUser' is possibly 'undefined'.",
        },
      ],
    }
    const result = transformTemplateDiagnostic(
      ts,
      service.language,
      id => id,
      diagnostic,
    )
    expect(ts.flattenDiagnosticMessageText(result.messageText, '\n')).toBe(
      "Outer message\n  'optionalUser' is possibly 'undefined'.",
    )
    expect(result.relatedInformation![0].messageText).toBe(
      "'optionalUser' is possibly 'undefined'.",
    )
    expect(
      ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n'),
    ).toContain('__MPX_ctx.optionalUser')
    expect(diagnostic.relatedInformation![0].messageText).toContain(
      '__MPX_ctx.optionalUser',
    )
  })

  it('preserves literal type text and supports localized expression quotes', () => {
    const { root } = service.getServiceScript('index.mpx')
    const start = source.indexOf('optionalUser')
    const format = (message: string, code: number) =>
      formatTemplateDiagnosticMessage(
        ts,
        root,
        start,
        'optionalUser'.length,
        message,
        code,
      )
    const literal = `Type '"__MPX_ctx.optionalUser"' is not assignable to type '"allowed"'.`
    expect(format(literal, 2322)).toBe(literal)
    expect(format('“__MPX_ctx.optionalUser”可能为“未定义”。', 18048)).toBe(
      '“optionalUser”可能为“未定义”。',
    )
  })

  it.each([
    [
      'unknownItems[selectedIndex]',
      '__MPX_ctx.unknownItems[__MPX_ctx.selectedIndex]',
    ],
    ["userMap['__MPX_ctx.name']", "__MPX_ctx.userMap['__MPX_ctx.name']"],
    ['user.__MPX_ctx', '__MPX_ctx.user.__MPX_ctx'],
    ['selectedIndex', '__MPX_dollars.selectedIndex'],
  ])(
    'restores %s while preserving user property names and literals',
    (expression, generated) => {
      const { root } = service.getServiceScript('index.mpx')
      const message = `'${generated}' is of type 'unknown'.`
      expect(
        formatTemplateDiagnosticMessage(
          ts,
          root,
          source.indexOf(expression),
          expression.length,
          message,
          18046,
        ),
      ).toBe(`'${expression}' is of type 'unknown'.`)
    },
  )

  it('keeps template variable hover types and source definitions', () => {
    const start = source.indexOf('optionalUser')
    expect(
      ts.displayPartsToString(
        proxy.getQuickInfoAtPosition(fileName, start + 1)?.displayParts,
      ),
    ).toBe('(property) optionalUser: User | undefined')
    const definitions = proxy.getDefinitionAtPosition(fileName, start + 1)
    expect(definitions).toEqual(
      service.proxyLanguageService.getDefinitionAtPosition(fileName, start + 1),
    )
    expect(definitions?.[0].fileName).toBe(fileName)
    expect(
      source.slice(
        definitions![0].textSpan.start,
        definitions![0].textSpan.start + definitions![0].textSpan.length,
      ),
    ).toBe('optionalUser')
  })

  it.each(['index.mpx', 'literal-types.mpx', 'directives.mpx'])(
    'uses syntax accepted by the real Mpx compiler in %s',
    async relativePath => {
      await expect(
        compileMpxFixture(service.file(relativePath)),
      ).resolves.toHaveProperty('wxml')
    },
  )
})
