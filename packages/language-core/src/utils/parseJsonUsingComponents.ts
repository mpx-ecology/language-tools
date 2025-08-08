import type { SfcJsonBlockUsingComponents } from '../types'
import type * as ts from 'typescript'

export function parseUsingComponents(
  ts: typeof import('typescript'),
  sourceFile: ts.SourceFile,
  lang: string,
) {
  if (lang === 'js') {
    return parseUsingComponentsWithJs(ts, sourceFile)
  }
  return parseUsingComponentsWithJson(ts, sourceFile)
}

export function parseUsingComponentsWithJson(
  ts: typeof import('typescript'),
  sourceFile: ts.SourceFile,
): SfcJsonBlockUsingComponents {
  const usingComponents: SfcJsonBlockUsingComponents = new Map()

  if (
    !sourceFile.statements.length ||
    !ts.isExpressionStatement(sourceFile.statements[0])
  ) {
    return usingComponents
  }

  const objectLiteral = sourceFile.statements[0].expression
  if (!ts.isObjectLiteralExpression(objectLiteral)) {
    return usingComponents
  }

  const usingComponentsProperty = objectLiteral.properties.find(
    (prop): prop is ts.PropertyAssignment =>
      ts.isPropertyAssignment(prop) &&
      ts.isStringLiteral(prop.name) &&
      prop.name.text === 'usingComponents',
  )

  if (
    usingComponentsProperty &&
    ts.isObjectLiteralExpression(usingComponentsProperty.initializer)
  ) {
    for (const prop of usingComponentsProperty.initializer.properties) {
      if (
        ts.isPropertyAssignment(prop) &&
        ts.isStringLiteral(prop.name) &&
        ts.isStringLiteral(prop.initializer)
      ) {
        // eg: name: 'list', text: '../components/list'
        if (!usingComponents.has(prop.name.text)) {
          usingComponents.set(prop.name.text, [])
        }
        usingComponents.get(prop.name.text)!.push({
          text: prop.initializer.text,
          offset: prop.initializer.getStart(sourceFile),
          nameOffset: prop.name.getStart(sourceFile),
        })
      }
    }
  }

  return usingComponents
}

export function parseUsingComponentsWithJs(
  ts: typeof import('typescript'),
  sourceFile: ts.SourceFile,
): SfcJsonBlockUsingComponents {
  const usingComponents: SfcJsonBlockUsingComponents = new Map()

  function visit(node: ts.Node) {
    if (
      ts.isPropertyAssignment(node) &&
      (ts.isIdentifier(node.name) || ts.isStringLiteral(node.name)) &&
      node.name.text === 'usingComponents'
    ) {
      if (ts.isObjectLiteralExpression(node.initializer)) {
        parseObjectLiteralProperties(node.initializer.properties)
      }
    }

    ts.forEachChild(node, visit)
  }

  function parseObjectLiteralProperties(
    properties: ts.NodeArray<ts.ObjectLiteralElementLike>,
  ) {
    for (const prop of properties) {
      if (
        ts.isPropertyAssignment(prop) &&
        (ts.isIdentifier(prop.name) || ts.isStringLiteral(prop.name)) &&
        (ts.isStringLiteral(prop.initializer) ||
          ts.isIdentifier(prop.initializer) ||
          ts.isPropertyAccessExpression(prop.initializer))
      ) {
        parsePropertyAssignment(prop)
      } else if (ts.isSpreadAssignment(prop)) {
        handleSpreadAssignment(prop)
      }
    }
  }

  function parsePropertyAssignment(prop: ts.PropertyAssignment) {
    const name = (prop.name as ts.Identifier | ts.StringLiteral).text
    let text = ''
    let _variableOffset: number | undefined = undefined

    if (ts.isStringLiteral(prop.initializer)) {
      text = prop.initializer.text
    } else if (ts.isIdentifier(prop.initializer)) {
      const identifierName = prop.initializer.text
      const { variableValue, variableOffset } = findVariableValue(
        ts,
        sourceFile,
        identifierName,
      )
      if (variableValue) {
        text = variableValue
        _variableOffset = variableOffset
      }
    } else if (ts.isPropertyAccessExpression(prop.initializer)) {
      text = sourceFile.text.substring(
        prop.initializer.getStart(),
        prop.initializer.getEnd(),
      )
    }

    if (text) {
      if (!usingComponents.has(name)) {
        usingComponents.set(name, [])
      }
      usingComponents.get(name)!.push({
        text,
        offset: _variableOffset ?? prop.initializer.getStart(sourceFile),
        nameOffset: prop.name.getStart(sourceFile),
      })
    }
  }

  function handleSpreadAssignment(spreadProp: ts.SpreadAssignment) {
    let expression = spreadProp.expression

    // 处理条件表达式 __mpx_mode__ === "web" && ({ ... })
    if (
      ts.isBinaryExpression(expression) &&
      expression.operatorToken.kind === ts.SyntaxKind.AmpersandAmpersandToken
    ) {
      // 取右侧的对象表达式
      expression = expression.right
    }

    // 处理三目运算符 __mpx_mode__ === "web" ? ({ ... }) : ({ ... })
    if (ts.isConditionalExpression(expression)) {
      parseObjectFromExpression(expression.whenTrue)
      parseObjectFromExpression(expression.whenFalse)
      return
    }

    // 处理直接解构 ...({ ... }) 或其他表达式
    parseObjectFromExpression(expression)
  }

  function parseObjectFromExpression(expression: ts.Expression) {
    // 处理括号包裹的表达式 ({ ... })
    if (ts.isParenthesizedExpression(expression)) {
      expression = expression.expression
    }

    // 如果是对象字面量，解析其中的属性
    if (ts.isObjectLiteralExpression(expression)) {
      parseObjectLiteralProperties(expression.properties)
    }
  }

  visit(sourceFile)

  return usingComponents
}

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
