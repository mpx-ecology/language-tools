import type { Code, MpxCodeInformation } from '../../types'
import { capitalize } from '../../utils/shared'

export function* generateCamelized(
  code: string,
  source: string,
  offset: number,
  features: MpxCodeInformation,
): Generator<Code> {
  const parts = code.split('-')
  const startCombineOffset = features.__combineOffset ?? 0

  for (let i = 0; i < parts.length; i++) {
    const part = parts[i]
    if (part !== '') {
      if (i === 0) {
        yield [part, source, offset, features]
      } else {
        yield [
          capitalize(part),
          source,
          offset,
          { __combineOffset: startCombineOffset + i },
        ]
      }
    }
    offset += part.length + 1
  }
}
