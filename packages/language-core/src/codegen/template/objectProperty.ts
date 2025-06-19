import type { Code, MpxCodeInformation } from '../../types'
import { camelize } from '@mpxjs/language-shared'
import {
  combineLastMapping,
  generateCamelized,
  generateStringLiteralKey,
  identifierRegex,
  wrapWith,
} from '../utils'

export function* generateObjectProperty(
  code: string,
  offset: number,
  features: MpxCodeInformation,
  shouldCamelize = false,
): Generator<Code> {
  if (shouldCamelize) {
    if (identifierRegex.test(camelize(code))) {
      yield* generateCamelized(code, 'template', offset, features)
    } else {
      yield* wrapWith(
        offset,
        offset + code.length,
        features,
        `'`,
        ...generateCamelized(code, 'template', offset, combineLastMapping),
        `'`,
      )
    }
  } else {
    if (identifierRegex.test(code)) {
      yield [code, 'template', offset, features]
    } else {
      yield* generateStringLiteralKey(code, offset, features)
    }
  }
}
