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
  const resolveBinding = createBindingResolver(ts, sourceFile)
  // Only consume writes when their object is reached from usingComponents.
  const objectAugments = new Map<LocalBinding, ts.Expression[]>()
  const parsedExpressions = new Set<ts.Expression>()

  function visit(node: ts.Node) {
    /**
     * usingComponents 会是两种情况
     */

    /**
     * Case 1 - shorthand property:
     *
     * module.exports = {
     *   usingComponents,
     * }
     *
     */
    if (
      ts.isShorthandPropertyAssignment(node) &&
      ts.isIdentifier(node.name) &&
      node.name.text === 'usingComponents'
    ) {
      parseObjectFromExpression(node.name)
      return
    }

    /**
     * Case 2 - normal property:
     *
     * module.exports = {
     *   usingComponents: foo,
     * }
     *
     */
    if (
      ts.isPropertyAssignment(node) &&
      (ts.isIdentifier(node.name) || ts.isStringLiteral(node.name)) &&
      node.name.text === 'usingComponents'
    ) {
      // 支持 usingComponents 为对象字面量或变量等表达式
      parseObjectFromExpression(node.initializer)
    }

    // 处理赋值语句：result.usingComponents.list = './list' 或 result.usingComponents['list'] = './list'
    if (
      ts.isExpressionStatement(node) &&
      ts.isBinaryExpression(node.expression)
    ) {
      const assignment = node.expression
      if (assignment.operatorToken.kind === ts.SyntaxKind.EqualsToken) {
        parseAssignmentExpression(assignment)
      }
    }

    ts.forEachChild(node, visit)
  }

  function collectAugments(node: ts.Node) {
    // Visit assignment expressions directly, including comma expressions and
    // conditional blocks. Computed component names are intentionally excluded.
    if (
      ts.isBinaryExpression(node) &&
      node.operatorToken.kind === ts.SyntaxKind.EqualsToken
    ) {
      const property = getStaticObjectProperty(node.left)
      if (property) {
        const binding = resolveBinding(property.object)
        const list = objectAugments.get(binding) ?? []
        list.push(node)
        objectAugments.set(binding, list)
      }
    }
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
        const binding = resolveBinding(target)
        const list = objectAugments.get(binding) ?? []
        for (let i = 1; i < node.arguments.length; i++) {
          list.push(node.arguments[i])
        }
        objectAugments.set(binding, list)
      }
    }
    ts.forEachChild(node, collectAugments)
  }

  function getStaticObjectProperty(expression: ts.Expression) {
    if (
      ts.isPropertyAccessExpression(expression) &&
      ts.isIdentifier(expression.expression) &&
      ts.isIdentifier(expression.name)
    ) {
      return { object: expression.expression, name: expression.name }
    }
    if (
      ts.isElementAccessExpression(expression) &&
      ts.isIdentifier(expression.expression) &&
      ts.isStringLiteral(expression.argumentExpression)
    ) {
      return {
        object: expression.expression,
        name: expression.argumentExpression,
      }
    }
  }

  function parseAssignmentExpression(assignment: ts.BinaryExpression) {
    const left = assignment.left
    const right = assignment.right

    // 处理 aliConfig.usingComponents = { list: './list' } 这种语法
    if (
      ts.isPropertyAccessExpression(left) &&
      ts.isIdentifier(left.name) &&
      left.name.text === 'usingComponents'
    ) {
      // 直接解析右侧的对象表达式
      parseObjectFromExpression(right)
      return
    }

    // 检查赋值的右侧是否为字符串字面量（用于属性级别的赋值）
    if (!ts.isStringLiteral(right)) {
      return
    }

    let componentName: string | undefined
    let isUsingComponentsAssignment = false

    // 处理点语法：result.usingComponents.list = './list'
    if (ts.isPropertyAccessExpression(left)) {
      const propertyAccess = left
      if (
        ts.isPropertyAccessExpression(propertyAccess.expression) &&
        ts.isIdentifier(propertyAccess.expression.name) &&
        propertyAccess.expression.name.text === 'usingComponents' &&
        ts.isIdentifier(propertyAccess.name)
      ) {
        componentName = propertyAccess.name.text
        isUsingComponentsAssignment = true
      }
    }

    // 处理方括号语法：result.usingComponents['list'] = './list'
    if (ts.isElementAccessExpression(left)) {
      const elementAccess = left
      if (
        ts.isPropertyAccessExpression(elementAccess.expression) &&
        ts.isIdentifier(elementAccess.expression.name) &&
        elementAccess.expression.name.text === 'usingComponents' &&
        elementAccess.argumentExpression &&
        ts.isStringLiteral(elementAccess.argumentExpression)
      ) {
        componentName = elementAccess.argumentExpression.text
        isUsingComponentsAssignment = true
      }
    }

    // 如果识别到 usingComponents 相关的赋值，添加到结果中
    if (isUsingComponentsAssignment && componentName) {
      const text = right.text
      if (!usingComponents.has(componentName)) {
        usingComponents.set(componentName, [])
      }
      usingComponents.get(componentName)!.push({
        text,
        offset: right.getStart(sourceFile),
        nameOffset: left.getStart(sourceFile),
      })
    }
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
    parseComponentPath(
      prop.name as ts.Identifier | ts.StringLiteral,
      prop.initializer,
    )
  }

  function parseComponentPath(
    nameNode: ts.Identifier | ts.StringLiteral,
    initializer: ts.Expression,
  ) {
    const name = nameNode.text
    let text = ''
    let _variableOffset: number | undefined = undefined

    if (ts.isStringLiteral(initializer)) {
      text = initializer.text
    } else if (ts.isIdentifier(initializer)) {
      const value = resolveBinding(initializer).initializer
      if (value && ts.isStringLiteral(value)) {
        text = value.text
        _variableOffset = value.getStart(sourceFile)
      }
    } else if (ts.isPropertyAccessExpression(initializer)) {
      text = sourceFile.text.substring(
        initializer.getStart(),
        initializer.getEnd(),
      )
    }

    if (text) {
      if (!usingComponents.has(name)) {
        usingComponents.set(name, [])
      }
      usingComponents.get(name)!.push({
        text,
        offset: _variableOffset ?? initializer.getStart(sourceFile),
        nameOffset: nameNode.getStart(sourceFile),
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
    // Shared spreads and cyclic object references must not duplicate mappings
    // or recurse indefinitely.
    if (parsedExpressions.has(expression)) {
      return
    }
    parsedExpressions.add(expression)

    if (
      ts.isBinaryExpression(expression) &&
      expression.operatorToken.kind === ts.SyntaxKind.EqualsToken
    ) {
      const property = getStaticObjectProperty(expression.left)
      if (property) {
        parseComponentPath(property.name, expression.right)
      }
      return
    }
    // 处理括号包裹的表达式 ({ ... })
    if (ts.isParenthesizedExpression(expression)) {
      expression = expression.expression
    }

    // 处理标识符：const components = { ... }; usingComponents: components
    if (ts.isIdentifier(expression)) {
      const binding = resolveBinding(expression)
      if (binding.initializer) {
        parseObjectFromExpression(binding.initializer)
      }
      // Merge writes only from this binding, including Object.assign sources.
      const augments = objectAugments.get(binding)
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

interface LocalBinding {
  initializer?: ts.Expression
}

interface LocalScope {
  parent?: LocalScope
  bindings: Map<string, LocalBinding>
  isVarScope: boolean
}

// The JSON AST has no parent links. Index scopes once, then resolve references
// after all declarations are known, including hoisted var and shadowing names.
function createBindingResolver(
  ts: typeof import('typescript'),
  sourceFile: ts.SourceFile,
) {
  const scopes = new Map<ts.Identifier, LocalScope>()
  const rootScope: LocalScope = {
    bindings: new Map(),
    isVarScope: true,
  }

  function declare(
    scope: LocalScope,
    name: ts.BindingName,
    initializer?: ts.Expression,
  ) {
    if (ts.isIdentifier(name)) {
      let binding = scope.bindings.get(name.text)
      if (!binding) {
        scope.bindings.set(name.text, (binding = {}))
      }
      binding.initializer ??= initializer
    } else {
      for (const element of name.elements) {
        if (ts.isBindingElement(element)) {
          declare(scope, element.name)
        }
      }
    }
  }

  function visit(node: ts.Node, scope: LocalScope, parent?: ts.Node) {
    const outerScope = scope
    if (
      (ts.isFunctionDeclaration(node) || ts.isClassDeclaration(node)) &&
      node.name
    ) {
      declare(scope, node.name)
    }

    const isFunction = ts.isFunctionLike(node)
    const isBlock = ts.isBlock(node)
    // Body vars cannot shadow names used by parameter initializers.
    const isVarScope =
      isFunction ||
      ts.isClassStaticBlockDeclaration(node) ||
      (isBlock && !!parent && ts.isFunctionLike(parent))
    if (
      isVarScope ||
      isBlock ||
      ts.isCatchClause(node) ||
      ts.isCaseBlock(node) ||
      ts.isForStatement(node) ||
      ts.isForInStatement(node) ||
      ts.isForOfStatement(node) ||
      ts.isClassDeclaration(node) ||
      ts.isClassExpression(node)
    ) {
      scope = { parent: scope, bindings: new Map(), isVarScope }
    }

    if (
      (ts.isFunctionExpression(node) || ts.isClassExpression(node)) &&
      node.name
    ) {
      declare(scope, node.name)
    }

    if (ts.isVariableDeclaration(node)) {
      let declarationScope = scope
      if (
        parent &&
        ts.isVariableDeclarationList(parent) &&
        !(parent.flags & ts.NodeFlags.BlockScoped)
      ) {
        while (!declarationScope.isVarScope && declarationScope.parent) {
          declarationScope = declarationScope.parent
        }
      }
      declare(declarationScope, node.name, node.initializer)
    } else if (ts.isParameter(node)) {
      // Parameters and destructuring still shadow outer names even when their
      // runtime values cannot be resolved to a static object or path.
      declare(scope, node.name)
    }

    if (ts.isIdentifier(node)) {
      scopes.set(node, scope)
    }
    if (isFunction) {
      // Computed method names are evaluated outside the function's bindings.
      ts.forEachChild(node, child =>
        visit(
          child,
          ts.isComputedPropertyName(child) ? outerScope : scope,
          node,
        ),
      )
    } else {
      ts.forEachChild(node, child => visit(child, scope, node))
    }
  }

  visit(sourceFile, rootScope)

  return (identifier: ts.Identifier) => {
    let scope = scopes.get(identifier)
    while (scope) {
      const binding = scope.bindings.get(identifier.text)
      if (binding) {
        return binding
      }
      scope = scope.parent
    }
    // Mpx injects CommonJS and user-defined globals. Intern unresolved names
    // at the root so their writes still share an identity, without a whitelist.
    const binding = rootScope.bindings.get(identifier.text) ?? {}
    rootScope.bindings.set(identifier.text, binding)
    return binding
  }
}
