import type { RawMpxCompilerOptions } from '../types'

const syntaxReg = /^\s*@(?<key>.+?)\s+(?<value>.+?)\s*$/m

export function parseMpxCompilerOptions(
  comments: string[],
): RawMpxCompilerOptions | undefined {
  const entries = comments
    .map(text => {
      try {
        const match = text.match(syntaxReg)
        if (match) {
          const { key, value } = match.groups ?? {}
          return [key, JSON.parse(value)] as const
        }
      } catch {
        // noop
      }
    })
    .filter(item => !!item)

  if (entries.length) {
    return Object.fromEntries(entries)
  }
}
