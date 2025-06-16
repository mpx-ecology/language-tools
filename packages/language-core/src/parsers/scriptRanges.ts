import type * as ts from 'typescript'
import type { MpxCompilerOptions, TextRange } from '../types'
import { parseBindingRanges } from './scriptSetupRanges'
import { getStartEnd } from '../utils/shared'

export interface ScriptRanges extends ReturnType<typeof parseScriptRanges> {}

export function parseScriptRanges(
  ts: typeof import('typescript'),
  ast: ts.SourceFile,
  hasScriptSetup: boolean,
  withNode: boolean,
  mpxCompilerOptions: MpxCompilerOptions,
) {
  let exportDefault:
    | (TextRange & {
        expression: TextRange
        args: TextRange
        argsNode: ts.ObjectLiteralExpression | undefined
      })
    | undefined
  let createComponentObj:
    | (TextRange & {
        expression: TextRange
        args: TextRange
        argsNode: ts.ObjectLiteralExpression | undefined
      })
    | undefined

  const bindings = hasScriptSetup ? parseBindingRanges(ts, ast) : []

  ts.forEachChild(ast, raw => {
    const node = getCreateComponentExpression(raw)
    if (node) {
      let obj: ts.ObjectLiteralExpression | undefined
      if (node.arguments.length) {
        const arg0 = node.arguments[0]
        if (ts.isObjectLiteralExpression(arg0)) {
          obj = arg0
        }
      }
      if (obj) {
        createComponentObj = {
          ..._getStartEnd(raw),
          expression: _getStartEnd(obj),
          args: _getStartEnd(obj),
          argsNode: withNode ? obj : undefined,
        }
      }
    }
  })

  return {
    exportDefault,
    createComponentObj,
    bindings,
  }

  function _getStartEnd(node: ts.Node) {
    return getStartEnd(ts, node, ast)
  }

  function getCreateComponentExpression(node: ts.Node) {
    const { optionsComponentCtor } = mpxCompilerOptions
    if (ts.isExpressionStatement(node)) {
      const res = node.expression
      if (ts.isCallExpression(res)) {
        const expression = res.expression
        if (
          ts.isIdentifier(expression) &&
          optionsComponentCtor.includes(expression.escapedText as string)
        ) {
          return res
        }
      }
    }
    return false
  }
}
