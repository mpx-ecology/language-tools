import type * as ts from 'typescript'
import type { TextRange } from '../types'

const cacheStringFunction = <T extends (str: string) => string>(fn: T): T => {
  const cache: Record<string, string> = Object.create(null)
  return ((str: string) => {
    const hit = cache[str]
    return hit || (cache[str] = fn(str))
  }) as T
}

const hyphenateRE = /\B([A-Z])/g

export const hyphenate: (str: string) => string = cacheStringFunction(
  (str: string) => str.replace(hyphenateRE, '-$1').toLowerCase(),
)

export { hyphenate as hyphenateTag }

export function hyphenateAttr(str: string) {
  let hyphencase = hyphenate(str)
  if (str.length && str[0] !== str[0].toLowerCase()) {
    hyphencase = '-' + hyphencase
  }
  return hyphencase
}

export function getSlotsPropertyName(vueVersion: number) {
  return vueVersion < 3 ? '$scopedSlots' : '$slots'
}

export function getStartEnd(
  ts: typeof import('typescript'),
  node: ts.Node,
  ast: ts.SourceFile,
): TextRange {
  return {
    start: (ts as any).getTokenPosOfNode(node, ast) as number,
    end: node.end,
  }
}

export function getNodeText(
  ts: typeof import('typescript'),
  node: ts.Node,
  ast: ts.SourceFile,
) {
  const { start, end } = getStartEnd(ts, node, ast)
  return ast.text.slice(start, end)
}

const camelizeRE = /-(\w)/g

export const camelize: (str: string) => string = cacheStringFunction(
  (str: string): string => {
    return str.replace(camelizeRE, (_, c) => (c ? c.toUpperCase() : ''))
  },
)

export const capitalize: <T extends string>(str: T) => Capitalize<T> =
  cacheStringFunction(<T extends string>(str: T) => {
    return (str.charAt(0).toUpperCase() + str.slice(1)) as Capitalize<T>
  })
