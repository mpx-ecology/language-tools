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
  let createComponentObj:
    | (TextRange & {
        expression: TextRange
        args: TextRange
        argsNode: ts.ObjectLiteralExpression | undefined
        ctor: 'Component' | 'Page'
      })
    | undefined

  const bindings = hasScriptSetup ? parseBindingRanges(ts, ast) : []

  ts.forEachChild(ast, raw => {
    const { node, ctor } = getCreateComponentExpression(raw)
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
          ctor,
        }
      }
    }
  })

  return {
    createComponentObj,
    bindings,
  }

  function _getStartEnd(node: ts.Node) {
    return getStartEnd(ts, node, ast)
  }

  function getCreateComponentExpression(node: ts.Node): {
    node: ts.CallExpression | null
    ctor: 'Component' | 'Page'
  } {
    const { optionsComponentCtor, optionsPageCtor } = mpxCompilerOptions
    if (ts.isExpressionStatement(node)) {
      const res = node.expression
      if (ts.isCallExpression(res)) {
        const expression = res.expression
        if (ts.isIdentifier(expression)) {
          if (optionsComponentCtor.includes(expression.escapedText as string)) {
            return { node: res, ctor: 'Component' }
          } else if (
            optionsPageCtor.includes(expression.escapedText as string)
          ) {
            return { node: res, ctor: 'Page' }
          }
        }
      }
    }
    return {
      node: null,
      ctor: 'Component',
    }
  }
}
