import { readFileSync } from 'node:fs'
import path from 'node:path'
import * as ts from 'typescript'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { formatTemplateDiagnosticMessage } from '../src'
import {
  type TestLanguageService,
  createTestLanguageService,
} from './utils/createTestLanguageService'

const locales = [
  'cs',
  'de',
  'es',
  'fr',
  'it',
  'ja',
  'ko',
  'pl',
  'pt-br',
  'ru',
  'tr',
  'zh-cn',
  'zh-tw',
]
const expressionDiagnostics = [
  ['unknownValue', 18046, '_0_is_of_type_unknown_18046'],
  ['nullableUser', 18047, '_0_is_possibly_null_18047'],
  ['optionalUser', 18048, '_0_is_possibly_undefined_18048'],
  ['nullishUser', 18049, '_0_is_possibly_null_or_undefined_18049'],
] as const

describe('localized template diagnostic formatting', () => {
  let service: TestLanguageService

  beforeAll(() => {
    service = createTestLanguageService(
      path.resolve(__dirname, 'fixtures/template-diagnostics'),
    )
  })
  afterAll(() => service.dispose())

  function format(expression: string, message: string, code: number) {
    return formatTemplateDiagnosticMessage(
      ts,
      service.getServiceScript('index.mpx').root,
      service.read('index.mpx').indexOf(expression),
      expression.length,
      message,
      code,
    )
  }

  function translations(locale: string): Record<string, string> {
    return JSON.parse(
      readFileSync(
        path.join(
          path.dirname(ts.sys.getExecutingFilePath()),
          locale,
          'diagnosticMessages.generated.json',
        ),
        'utf8',
      ),
    )
  }

  it.each(locales)('restores expressions in TypeScript %s messages', locale => {
    const messages = translations(locale)
    for (const [expression, code, key] of expressionDiagnostics) {
      const template = messages[key]!
      for (const context of ['__MPX_ctx', '__MPX_dollars']) {
        expect(
          format(
            expression,
            template.replace('{0}', `${context}.${expression}`),
            code,
          ),
        ).toBe(template.replace('{0}', expression))
      }
    }
  })

  it.each(locales)(
    'preserves string literal types in TypeScript %s messages',
    locale => {
      const template =
        translations(locale).Type_0_is_not_assignable_to_type_1_2322
      for (const type of [
        '"__MPX_ctx.optionalUser"',
        '{ name: "__MPX_ctx.optionalUser" }',
      ]) {
        const message = template
          .replace('{0}', type)
          .replace('{1}', '"allowed"')
        expect(format('optionalUser', message, 2322)).toBe(message)
      }
    },
  )

  it.each([
    ['"', '"'],
    ['„', '“'],
    ['„', '”'],
  ])(
    'preserves quoted index keys with %s%s expression quotes',
    (open, close) => {
      const expression = "userMap['__MPX_ctx.name']"
      expect(
        format(
          expression,
          `${open}__MPX_ctx.${expression}${close} is possibly undefined.`,
          18048,
        ),
      ).toBe(`${open}${expression}${close} is possibly undefined.`)
    },
  )
})
