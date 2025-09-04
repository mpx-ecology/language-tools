import type { SfcJsonBlockPages } from '../types'
import type * as ts from 'typescript'

export function parsePages(
  ts: typeof import('typescript'),
  sourceFile: ts.SourceFile,
  lang: string,
) {
  if (lang === 'js') {
    return parsePagesWithJs(ts, sourceFile)
  }
  return parsePagesWithJson(ts, sourceFile)
}

export function parsePagesWithJson(
  ts: typeof import('typescript'),
  sourceFile: ts.SourceFile,
): SfcJsonBlockPages {
  const pages: SfcJsonBlockPages = []

  if (
    !sourceFile.statements.length ||
    !ts.isExpressionStatement(sourceFile.statements[0])
  ) {
    return pages
  }

  const objectLiteral = sourceFile.statements[0].expression
  if (!ts.isObjectLiteralExpression(objectLiteral)) {
    return pages
  }

  const pagesProperty = objectLiteral.properties.find(
    (prop): prop is ts.PropertyAssignment =>
      ts.isPropertyAssignment(prop) &&
      ts.isStringLiteral(prop.name) &&
      prop.name.text === 'pages',
  )

  if (pagesProperty && ts.isArrayLiteralExpression(pagesProperty.initializer)) {
    for (const el of pagesProperty.initializer.elements) {
      if (ts.isStringLiteral(el)) {
        pages.push({
          text: el.text,
          offset: el.getStart(sourceFile),
          nameOffset: el.getStart(sourceFile),
        })
      }
    }
  }

  return pages
}

export function parsePagesWithJs(
  ts: typeof import('typescript'),
  sourceFile: ts.SourceFile,
): SfcJsonBlockPages {
  const pages: SfcJsonBlockPages = []

  function visit(node: ts.Node) {
    if (
      ts.isPropertyAssignment(node) &&
      (ts.isIdentifier(node.name) || ts.isStringLiteral(node.name)) &&
      node.name.text === 'pages'
    ) {
      // 支持 pages 为数组字面量或变量等表达式
      parseArrayFromExpression(node.initializer)
    }

    ts.forEachChild(node, visit)
  }

  function parseArrayLiteralElements(elements: ts.NodeArray<ts.Expression>) {
    for (const el of elements) {
      if (ts.isStringLiteral(el)) {
        pages.push({
          text: el.text,
          offset: el.getStart(sourceFile),
          nameOffset: el.getStart(sourceFile),
        })
      } else if (ts.isSpreadElement(el)) {
        parseArrayFromExpression(el.expression)
      } else if (ts.isIdentifier(el)) {
        const { variableValue, variableOffset } = findVariableValue(
          ts,
          sourceFile,
          el.text,
        )
        if (variableValue) {
          pages.push({
            text: variableValue,
            offset: variableOffset ?? el.getStart(sourceFile),
            nameOffset: variableOffset ?? el.getStart(sourceFile),
          })
        }
      }
    }
  }

  function parseArrayFromExpression(expression: ts.Expression) {
    // 处理括号包裹的表达式 ([ ... ])
    if (ts.isParenthesizedExpression(expression)) {
      expression = expression.expression
    }

    // 处理标识符：const pagesArr = [ ... ]; pages: pagesArr
    if (ts.isIdentifier(expression)) {
      const varName = expression.text
      const resolved = findVariableInitializerExpression(
        ts,
        sourceFile,
        varName,
      )
      if (resolved) {
        parseArrayFromExpression(resolved)
      }
      return
    }

    // 处理逻辑与表达式：cond && [ ... ]
    if (
      ts.isBinaryExpression(expression) &&
      expression.operatorToken.kind === ts.SyntaxKind.AmpersandAmpersandToken
    ) {
      return parseArrayFromExpression(expression.right)
    }

    // 处理三元表达式：cond ? [ ... ] : [ ... ]
    if (ts.isConditionalExpression(expression)) {
      parseArrayFromExpression(expression.whenTrue)
      parseArrayFromExpression(expression.whenFalse)
      return
    }

    // 处理数组字面量
    if (ts.isArrayLiteralExpression(expression)) {
      parseArrayLiteralElements(expression.elements)
      return
    }

    // 处理 concat： [ ... ].concat(a, b)
    if (ts.isCallExpression(expression)) {
      if (
        ts.isPropertyAccessExpression(expression.expression) &&
        expression.expression.name.text === 'concat'
      ) {
        // 解析目标数组
        parseArrayFromExpression(expression.expression.expression)
        // 再解析 concat 的参数
        for (const arg of expression.arguments) {
          parseArrayFromExpression(arg)
        }
        return
      }
    }
  }

  visit(sourceFile)

  return pages
}

/**
 * 查找某个表示路径的字符串变量的初始值（用于单个字符串路径变量）
 */
function findVariableValue(
  ts: typeof import('typescript'),
  sourceFile: ts.SourceFile,
  identifierName: string,
) {
  let variableValue: string | undefined = undefined
  let variableOffset: number | undefined = undefined

  function findDeclaration(node: ts.Node): boolean | undefined {
    if (
      (ts.isVariableDeclaration(node) || ts.isPropertyAssignment(node)) &&
      ts.isIdentifier(node.name) &&
      node.name.text === identifierName &&
      node.initializer &&
      ts.isStringLiteral(node.initializer)
    ) {
      variableValue = node.initializer.text
      variableOffset = node.initializer.getStart(sourceFile)
      return true
    }

    return ts.forEachChild(node, findDeclaration)
  }

  findDeclaration(sourceFile)
  return { variableValue, variableOffset }
}

/**
 * 查找赋值给 pages 的数组变量的初始表达式（用于解析赋值给 pages 的数组变量）
 */
function findVariableInitializerExpression(
  ts: typeof import('typescript'),
  sourceFile: ts.SourceFile,
  identifierName: string,
) {
  let initExp: ts.Expression | undefined

  function findDeclaration(node: ts.Node): boolean | undefined {
    if (
      ts.isVariableDeclaration(node) &&
      ts.isIdentifier(node.name) &&
      node.name.text === identifierName &&
      !!node.initializer
    ) {
      initExp = node.initializer
      return true
    }

    return ts.forEachChild(node, findDeclaration)
  }

  findDeclaration(sourceFile)
  return initExp
}
