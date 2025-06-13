import type * as ts from 'typescript'
import type { TextRange } from '../types'
import { parseBindingRanges } from './scriptSetupRanges'
import { getNodeText, getStartEnd } from '../utils/shared'

export interface ScriptRanges extends ReturnType<typeof parseScriptRanges> {}

export function parseScriptRanges(
  ts: typeof import('typescript'),
  ast: ts.SourceFile,
  hasScriptSetup: boolean,
  withNode: boolean,
) {
  let exportDefault:
    | (TextRange & {
        expression: TextRange
        args: TextRange
        argsNode: ts.ObjectLiteralExpression | undefined
        componentsOption: TextRange | undefined
        componentsOptionNode: ts.ObjectLiteralExpression | undefined
        nameOption: TextRange | undefined
      })
    | undefined
  let createComponentObj:
    | (TextRange & {
        expression: TextRange
        args: TextRange
        argsNode: ts.ObjectLiteralExpression | undefined
        componentsOption: TextRange | undefined
        componentsOptionNode: ts.ObjectLiteralExpression | undefined
        nameOption: TextRange | undefined
      })
    | undefined
  let classBlockEnd: number | undefined

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
        let componentsOptionNode: ts.ObjectLiteralExpression | undefined
        ts.forEachChild(obj, node => {
          if (ts.isPropertyAssignment(node) && ts.isIdentifier(node.name)) {
            const name = _getNodeText(node.name)
            console.log('---> debug name', name)
          }
        })
        createComponentObj = {
          ..._getStartEnd(raw),
          expression: _getStartEnd(node.expression),
          args: _getStartEnd(obj),
          argsNode: withNode ? obj : undefined,
          componentsOption: undefined,
          componentsOptionNode: withNode ? componentsOptionNode : undefined,
          nameOption: undefined,
        }
      }
    }

    if (
      ts.isClassDeclaration(raw) &&
      raw.modifiers?.some(mod => mod.kind === ts.SyntaxKind.ExportKeyword) &&
      raw.modifiers?.some(mod => mod.kind === ts.SyntaxKind.DefaultKeyword)
    ) {
      classBlockEnd = raw.end - 1
    }
  })

  return {
    exportDefault,
    createComponentObj,
    classBlockEnd,
    bindings,
  }

  function _getStartEnd(node: ts.Node) {
    return getStartEnd(ts, node, ast)
  }

  function _getNodeText(node: ts.Node) {
    return getNodeText(ts, node, ast)
  }

  function getCreateComponentExpression(node: ts.Node) {
    if (ts.isExpressionStatement(node)) {
      const res = node.expression
      if (ts.isCallExpression(res)) {
        const expression = res.expression
        if (
          ts.isIdentifier(expression) &&
          expression.escapedText === 'createComponent'
        ) {
          return res
        }
      }
    }
    return false
  }
}
