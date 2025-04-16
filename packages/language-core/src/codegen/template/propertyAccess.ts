import type { Code, MpxCodeInformation } from '../../types'
import type { TemplateCodegenOptions } from './index'
import type { TemplateCodegenContext } from './context'

import { generateInterpolation } from './interpolation'
import { generateStringLiteralKey, identifierRegex } from '../utils'

export function* generatePropertyAccess(
  options: TemplateCodegenOptions,
  ctx: TemplateCodegenContext,
  code: string,
  offset?: number,
  features?: MpxCodeInformation,
  astHolder?: any,
): Generator<Code> {
  if (
    !options.compilerOptions.noPropertyAccessFromIndexSignature &&
    identifierRegex.test(code)
  ) {
    yield `.`
    yield offset !== undefined && features
      ? [code, 'template', offset, features]
      : code
  } else if (code.startsWith('[') && code.endsWith(']')) {
    yield* generateInterpolation(
      options,
      ctx,
      'template',
      features,
      code,
      offset,
      astHolder,
    )
  } else {
    yield `[`
    yield* generateStringLiteralKey(code, offset, features)
    yield `]`
  }
}
