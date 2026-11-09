import type * as ts from 'typescript'
import type { Code, MpxCodeInformation, SfcBlock } from '../../types'

import * as CompilerDOM from '@vue/compiler-dom'
import { getNodeText } from '../../utils/shared'

export * from './camelized'
export * from './escaped'
export * from './mustache'
export * from './stringLiteralKey'
export * from './unicode'
export * from './wrapWith'

export const newLine = `\n`
export const endOfLine = `;${newLine}`
export const combineLastMapping: MpxCodeInformation = { __combineOffset: 1 }
export const identifierRegex = /^[a-zA-Z_$][0-9a-zA-Z_$]*$/

/** Compact plain text without moving or merging mapped source segments. */
export function appendCode(codes: Code[], code: Code) {
  const last = codes[codes.length - 1]
  if (typeof code === 'string' && typeof last === 'string')
    codes[codes.length - 1] = last + code
  else codes.push(code)
}

export function collectVars(
  ts: typeof import('typescript'),
  node: ts.Node,
  ast: ts.SourceFile,
  results: string[] = [],
) {
  const identifiers = collectIdentifiers(ts, node, [])
  for (const { id } of identifiers) {
    results.push(getNodeText(ts, id, ast))
  }
  return results
}

export function collectIdentifiers(
  ts: typeof import('typescript'),
  node: ts.Node,
  results: {
    id: ts.Identifier
    isRest: boolean
    initializer: ts.Expression | undefined
  }[] = [],
  isRest = false,
  initializer: ts.Expression | undefined = undefined,
) {
  if (ts.isIdentifier(node)) {
    results.push({ id: node, isRest, initializer })
  } else if (ts.isObjectBindingPattern(node)) {
    for (const el of node.elements) {
      collectIdentifiers(
        ts,
        el.name,
        results,
        !!el.dotDotDotToken,
        el.initializer,
      )
    }
  } else if (ts.isArrayBindingPattern(node)) {
    for (const el of node.elements) {
      if (ts.isBindingElement(el)) {
        collectIdentifiers(ts, el.name, results, !!el.dotDotDotToken)
      }
    }
  } else {
    ts.forEachChild(node, node => collectIdentifiers(ts, node, results, false))
  }
  return results
}

export function normalizeAttributeValue(
  node: CompilerDOM.TextNode,
): [string, number] {
  let offset = node.loc.start.offset
  let content = node.loc.source
  if (
    (content.startsWith(`'`) && content.endsWith(`'`)) ||
    (content.startsWith(`"`) && content.endsWith(`"`))
  ) {
    offset++
    content = content.slice(1, -1)
  }
  return [content, offset]
}

/** Shared trees contain syntax only; scope and mappings are rebuilt per use. */
const expressionSyntax = new WeakMap<typeof ts, Map<string, ts.SourceFile>>()
const maxSharedExpressions = 1024
const maxSharedExpressionLength = 256

export function createTsAst(
  ts: typeof import('typescript'),
  astHolder: any,
  text: string,
) {
  if (astHolder.__volar_ast_text !== text) {
    let cache: Map<string, ts.SourceFile> | undefined
    if (text.length <= maxSharedExpressionLength) {
      cache = expressionSyntax.get(ts)
      if (!cache) expressionSyntax.set(ts, (cache = new Map()))
    }
    let ast = cache?.get(text)
    if (!ast) {
      ast = ts.createSourceFile(
        'mpx_ast.ts',
        cache ? text.split('').join('') : text,
        99 satisfies ts.ScriptTarget.Latest,
      )
      if (cache) {
        if (cache.size >= maxSharedExpressions)
          cache.delete(cache.keys().next().value!)
        cache.set(ast.text, ast)
      }
    }
    astHolder.__volar_ast_text = text
    astHolder.__volar_ast = ast
  }
  return astHolder.__volar_ast as ts.SourceFile
}

export function generateSfcBlockSection(
  block: SfcBlock,
  start: number,
  end: number,
  features: MpxCodeInformation,
): Code {
  return [block.content.slice(start, end), block.name, start, features]
}

export function* generateDefineComponent(
  block: SfcBlock,
  start: number,
  end: number,
  features: MpxCodeInformation,
): Generator<Code> {
  const content = block.content.slice(start, end)
  const index = content.indexOf('[REACTHOOKSEXEC]')
  if (index !== -1) {
    yield [content.slice(0, index), block.name, start, features]
    yield '__REACTHOOKSEXEC'
    yield [
      content.slice(index + '[REACTHOOKSEXEC]'.length),
      block.name,
      start + index + '[REACTHOOKSEXEC]'.length,
      features,
    ]
  } else {
    yield [content, block.name, start, features]
  }
}
