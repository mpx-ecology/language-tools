import type { TemplateCodegenOptions } from './index'
import type { TemplateCodegenContext } from './context'
import type { Code, MpxCodeInformation } from '../../types'

import {
  combineLastMapping,
  generateCamelized,
  generateStringLiteralKey,
  identifierRegex,
  wrapWith,
} from '../utils'
import { camelize } from '../../utils/shared'
import { generateInterpolation } from './interpolation'

export function* generateObjectProperty(
  options: TemplateCodegenOptions,
  ctx: TemplateCodegenContext,
  code: string,
  offset: number,
  features: MpxCodeInformation,
  astHolder?: any,
  shouldCamelize = false,
  shouldBeConstant = false,
): Generator<Code> {
  if (code.startsWith('[') && code.endsWith(']') && astHolder) {
    if (shouldBeConstant) {
      yield* generateInterpolation(
        options,
        ctx,
        'template',
        features,
        code.slice(1, -1),
        offset + 1,
        astHolder,
        `[__VLS_tryAsConstant(`,
        `)]`,
      )
    } else {
      yield* generateInterpolation(
        options,
        ctx,
        'template',
        features,
        code,
        offset,
        astHolder,
      )
    }
  } else if (shouldCamelize) {
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
