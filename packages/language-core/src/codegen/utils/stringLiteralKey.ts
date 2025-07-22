import type { Code, MpxCodeInformation } from '../../types'
import { combineLastMapping } from './index'
import { wrapWith } from './wrapWith'

export function* generateStringLiteralKey(
  code: string,
  offset?: number,
  info?: MpxCodeInformation,
  quotes = `'`,
): Generator<Code> {
  if (offset === undefined || !info) {
    yield `'${code}'`
  } else {
    yield* wrapWith(
      offset,
      offset + code.length,
      info,
      quotes,
      [code, 'template', offset, combineLastMapping],
      quotes,
    )
  }
}
