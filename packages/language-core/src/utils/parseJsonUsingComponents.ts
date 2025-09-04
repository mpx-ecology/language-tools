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
  // 记录对对象变量的补充：例如 const comps = ...;
  // Object.assign(comps, { classify: './classify' }); { usingComponents: comps }
  const objectAssignAugments: Map<string, ts.Expression[]> = new Map()

  function visit(node: ts.Node) {
    if (
      ts.isPropertyAssignment(node) &&
      (ts.isIdentifier(node.name) || ts.isStringLiteral(node.name)) &&
      node.name.text === 'usingComponents'
    ) {
      // 支持 usingComponents 为对象字面量或变量等表达式
      parseObjectFromExpression(node.initializer)
    }

    ts.forEachChild(node, visit)
  }

  function collectAugments(node: ts.Node) {
    // 收集 Object.assign(target, ...) 对象补充
    if (
      ts.isCallExpression(node) &&
      ts.isPropertyAccessExpression(node.expression) &&
      ts.isIdentifier(node.expression.expression) &&
      node.expression.expression.text === 'Object' &&
      node.expression.name.text === 'assign' &&
      node.arguments.length >= 2
    ) {
      const target = node.arguments[0]
      if (ts.isIdentifier(target)) {
        const targetName = target.text
        const list = objectAssignAugments.get(targetName) ?? []
        for (let i = 1; i < node.arguments.length; i++) {
          list.push(node.arguments[i])
        }
        objectAssignAugments.set(targetName, list)
      }
    }
    ts.forEachChild(node, collectAugments)
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

    // 处理条件表达式 __mpx_mode__ === 'web' && ({ ... })
    if (
      ts.isBinaryExpression(expression) &&
      expression.operatorToken.kind === ts.SyntaxKind.AmpersandAmpersandToken
    ) {
      // 取右侧的对象表达式
      expression = expression.right
    }

    // 处理三目运算符 __mpx_mode__ === 'web' ? ({ ... }) : ({ ... })
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

    // 处理标识符：const components = { ... }; usingComponents: components
    if (ts.isIdentifier(expression)) {
      const varName = expression.text
      const resolved = findVariableInitializerExpression(
        ts,
        sourceFile,
        varName,
      )
      if (resolved) {
        parseObjectFromExpression(resolved)
      }
      // 合并通过 Object.assign 收集到的补充
      const augments = objectAssignAugments.get(varName)
      if (augments && augments.length) {
        for (const augmentExp of augments) {
          parseObjectFromExpression(augmentExp)
        }
      }
      return
    }

    // 处理形如 (__mpx_mode__ === 'web' && { ... }) 的逻辑与表达式
    if (
      ts.isBinaryExpression(expression) &&
      expression.operatorToken.kind === ts.SyntaxKind.AmpersandAmpersandToken
    ) {
      // 只关心右侧对象部分
      return parseObjectFromExpression(expression.right)
    }

    // 处理形如 (__mpx_mode__ === 'web' ? { ... } : { ... }) 的三元表达式
    if (ts.isConditionalExpression(expression)) {
      parseObjectFromExpression(expression.whenTrue)
      parseObjectFromExpression(expression.whenFalse)
      return
    }

    // 如果是对象字面量，解析其中的属性
    if (ts.isObjectLiteralExpression(expression)) {
      parseObjectLiteralProperties(expression.properties)
      return
    }

    // 处理 Object.assign({}, {...}) 作为一个表达式传入的情况（例如解构或直接传入）
    if (
      ts.isCallExpression(expression) &&
      ts.isPropertyAccessExpression(expression.expression) &&
      ts.isIdentifier(expression.expression.expression) &&
      expression.expression.expression.text === 'Object' &&
      expression.expression.name.text === 'assign' &&
      expression.arguments.length >= 2
    ) {
      // 合并除第一个 target 之外的参数
      for (let i = 1; i < expression.arguments.length; i++) {
        parseObjectFromExpression(expression.arguments[i])
      }
      return
    }
  }

  // 先收集所有 augment，再解析 usingComponents，保证顺序无关
  collectAugments(sourceFile)
  visit(sourceFile)

  return usingComponents
}

/**
 * 查找变量的初始值（用于解析字符串路径变量）
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
 * 查找对象变量的初始表达式（用于解析赋值给 usingComponents 的对象变量）
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
