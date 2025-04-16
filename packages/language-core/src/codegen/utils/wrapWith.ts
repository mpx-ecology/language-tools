import type { Code, MpxCodeInformation } from '../../types'

export function wrapWith(
  startOffset: number,
  endOffset: number,
  features: MpxCodeInformation,
  ...codes: Code[]
): Generator<Code>

export function wrapWith(
  startOffset: number,
  endOffset: number,
  source: string,
  features: MpxCodeInformation,
  ...codes: Code[]
): Generator<Code>

export function* wrapWith(
  startOffset: number,
  endOffset: number,
  ...args: any[]
): Generator<Code> {
  let source = 'template'
  let features: MpxCodeInformation
  let codes: Code[]
  if (typeof args[0] === 'string') {
    ;[source, features, ...codes] = args
  } else {
    ;[features, ...codes] = args
  }

  yield ['', source, startOffset, features]
  let offset = 1
  for (const code of codes) {
    if (typeof code !== 'string') {
      offset++
    }
    yield code
  }
  yield ['', source, endOffset, { __combineOffset: offset }]
}
