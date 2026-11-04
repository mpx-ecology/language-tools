import type * as ts from 'typescript'
import {
  type MpxCompilerOptions,
  parseBindingRanges,
} from '@mpxjs/language-core'

interface Scope {
  parent?: Scope
  functionScope: boolean
  bindings: Map<string, ts.Node>
  types: Map<string, ts.Node>
}

// Deliberately local and syntax based: do not infer an instance field from an
// arbitrary type assertion, imported value or call returning an unknown object.
export function getReservedInstanceDataRanges(
  ts: typeof import('typescript'),
  ast: ts.SourceFile,
  setup: boolean,
  options: MpxCompilerOptions,
) {
  const scopes = new Map<ts.Node, Scope>()
  const parents = new Map<ts.Node, ts.Node>()
  const writes: ts.Expression[] = []
  const mutated = new Set<ts.Node>()
  const found = new Set<ts.Node>()
  const returnRanges: { start: number; end: number }[] = []
  const rootScope: Scope = {
    functionScope: true,
    bindings: new Map(),
    types: new Map(),
  }
  index(ast, rootScope)
  for (const write of writes) {
    let target = unwrap(write)
    while (
      ts.isPropertyAccessExpression(target) ||
      ts.isElementAccessExpression(target)
    ) {
      target = unwrap(target.expression)
    }
    if (ts.isIdentifier(target)) {
      let binding = resolve(target)
      while (binding && !mutated.has(binding)) {
        mutated.add(binding)
        const initializer =
          ts.isVariableDeclaration(binding) && binding.initializer
        binding =
          initializer && ts.isIdentifier(initializer)
            ? resolve(initializer)
            : undefined
      }
    }
  }

  const calls: ts.CallExpression[] = []
  for (const statement of ast.statements) {
    const expressions = ts.isExpressionStatement(statement)
      ? [statement.expression]
      : ts.isVariableStatement(statement)
        ? statement.declarationList.declarations.flatMap(d =>
            d.initializer ? [d.initializer] : [],
          )
        : []
    for (const expression of expressions) {
      const call = unwrap(expression)
      if (ts.isCallExpression(call)) calls.push(call)
    }
  }
  const hasDefineProps =
    setup &&
    calls.some(call => {
      if (getApi(call) === 'withDefaults' && call.arguments[0]) {
        const inner = unwrap(call.arguments[0])
        return ts.isCallExpression(inner) && getApi(inner) === 'defineProps'
      }
      return getApi(call) === 'defineProps'
    })
  let conditionalRanges: [number, number][] | undefined
  let setupHookFallback: ts.Node | undefined
  for (let expression of calls) {
    const api = getApi(expression)
    if (setup) {
      if (api === 'withDefaults' && expression.arguments[0]) {
        const inner = unwrap(expression.arguments[0])
        if (!ts.isCallExpression(inner)) continue
        expression = inner
      }
      const macro = getApi(expression)
      if (macro === 'defineProps') {
        checkObject(expression.arguments[0])
        checkType(expression.typeArguments?.[0])
      } else if (macro === 'defineExpose') {
        checkObject(expression.arguments[0])
        // Mpx's no-argument macro returns top-level runtime bindings. An
        // explicit empty object, in contrast, exposes none of those locals.
        if (!expression.arguments.length) {
          for (const binding of parseBindingRanges(ts, ast)) {
            if (
              ast.text.slice(binding.range.start, binding.range.end) ===
                'data' &&
              (binding.moduleName !== '@mpxjs/core' ||
                binding.isDefaultImport) &&
              // The compiler collects declarations directly in the setup
              // body, not block-hoisted var, enums or namespaces.
              ast.statements.some(
                statement =>
                  (ts.isVariableStatement(statement) ||
                    ts.isFunctionDeclaration(statement) ||
                    ts.isClassDeclaration(statement) ||
                    ts.isImportDeclaration(statement)) &&
                  binding.range.start >= statement.getStart(ast) &&
                  binding.range.end <= statement.end,
              )
            ) {
              returnRanges.push(binding.range)
            }
          }
        }
      } else if (macro === 'defineOptions') {
        checkOptions(expression.arguments[0], true)
      }
    }
    if (api === 'createComponent' || api === 'createPage')
      checkOptions(expression.arguments[0], false)
  }

  if (setup) checkFinalHook(ast, setupHookFallback)

  return [
    ...returnRanges,
    ...[...found].map(node => ({ start: node.getStart(ast), end: node.end })),
  ]

  function index(node: ts.Node, scope: Scope) {
    if (
      (ts.isFunctionDeclaration(node) || ts.isClassDeclaration(node)) &&
      node.name
    ) {
      scope.bindings.set(node.name.text, node)
    }
    if (
      ts.isBlock(node) ||
      ts.isFunctionLike(node) ||
      ts.isCatchClause(node) ||
      ts.isForStatement(node) ||
      ts.isForInStatement(node) ||
      ts.isForOfStatement(node) ||
      ts.isModuleBlock(node) ||
      ts.isClassLike(node)
    ) {
      scope = {
        parent: scope,
        functionScope: ts.isFunctionLike(node),
        bindings: new Map(),
        types: new Map(),
      }
    }
    scopes.set(node, scope)
    if (ts.isFunctionExpression(node) && node.name)
      scope.bindings.set(node.name.text, node)
    if (ts.isVariableDeclaration(node)) {
      let bindingScope = scope
      const declarationList = parents.get(node)
      if (
        declarationList &&
        ts.isVariableDeclarationList(declarationList) &&
        !(declarationList.flags & ts.NodeFlags.BlockScoped)
      ) {
        while (!bindingScope.functionScope && bindingScope.parent)
          bindingScope = bindingScope.parent
      }
      bind(node.name, node, bindingScope)
    } else if (ts.isParameter(node)) {
      bind(node.name, node, scope)
    } else if (ts.isImportClause(node) && node.name) {
      scope.bindings.set(node.name.text, node)
    } else if (ts.isImportSpecifier(node) || ts.isNamespaceImport(node)) {
      scope.bindings.set(node.name.text, node)
    } else if (
      ts.isTypeAliasDeclaration(node) ||
      ts.isInterfaceDeclaration(node)
    ) {
      scope.types.set(node.name.text, node)
    }
    if (
      ts.isBinaryExpression(node) &&
      node.operatorToken.kind >= ts.SyntaxKind.FirstAssignment &&
      node.operatorToken.kind <= ts.SyntaxKind.LastAssignment
    )
      writes.push(node.left)
    if (ts.isDeleteExpression(node)) writes.push(node.expression)
    ts.forEachChild(node, child => {
      parents.set(child, node)
      index(child, scope)
    })
  }

  function bind(name: ts.BindingName, declaration: ts.Node, scope: Scope) {
    if (ts.isIdentifier(name)) scope.bindings.set(name.text, declaration)
    else
      for (const element of name.elements) {
        if (ts.isBindingElement(element)) bind(element.name, declaration, scope)
      }
  }

  function resolve(name: ts.Identifier, typeOnly = false) {
    for (let scope = scopes.get(name); scope; scope = scope.parent) {
      const binding = (typeOnly ? scope.types : scope.bindings).get(name.text)
      if (binding) return binding
    }
  }

  function unwrap(node: ts.Node): ts.Node {
    while (
      ts.isParenthesizedExpression(node) ||
      ts.isAsExpression(node) ||
      ts.isTypeAssertionExpression(node) ||
      ts.isSatisfiesExpression(node) ||
      ts.isNonNullExpression(node)
    )
      node = node.expression
    return node
  }

  function localValue(node: ts.Node, seen: Set<ts.Node>): ts.Node | undefined {
    node = unwrap(node)
    if (!ts.isIdentifier(node)) return node
    const declaration = resolve(node)
    if (!declaration || seen.has(declaration) || mutated.has(declaration))
      return
    seen.add(declaration)
    if (ts.isFunctionDeclaration(declaration)) return declaration
    if (
      ts.isVariableDeclaration(declaration) &&
      ts.isIdentifier(declaration.name) &&
      declaration.initializer
    ) {
      const list = parents.get(declaration)
      if (
        list &&
        ts.isVariableDeclarationList(list) &&
        list.flags & ts.NodeFlags.Const
      )
        return localValue(declaration.initializer, seen)
    }
  }

  function coreImport(node: ts.Node) {
    while (!ts.isImportDeclaration(node)) {
      const parent = parents.get(node)
      if (!parent) return false
      node = parent
    }
    return (
      ts.isStringLiteral(node.moduleSpecifier) &&
      node.moduleSpecifier.text === '@mpxjs/core' &&
      !node.importClause?.isTypeOnly
    )
  }

  function getApi(call: ts.CallExpression) {
    return apiFor(call.expression)
  }

  function apiFor(
    expression: ts.Node,
    seen = new Set<ts.Node>(),
  ): string | undefined {
    expression = unwrap(expression)
    if (seen.has(expression)) return
    seen.add(expression)
    if (
      ts.isPropertyAccessExpression(expression) &&
      ts.isIdentifier(expression.expression)
    ) {
      const binding = resolve(expression.expression)
      if (
        binding &&
        ts.isNamespaceImport(binding) &&
        coreImport(binding) &&
        ['createComponent', 'createPage', 'onReactHooksExec'].includes(
          expression.name.text,
        )
      )
        return expression.name.text
    }
    if (!ts.isIdentifier(expression)) return
    const name = expression.text
    const binding = resolve(expression)
    if (
      binding &&
      ts.isImportSpecifier(binding) &&
      !binding.isTypeOnly &&
      coreImport(binding) &&
      ['createComponent', 'createPage', 'onReactHooksExec'].includes(
        binding.propertyName?.text ?? binding.name.text,
      )
    )
      return binding.propertyName?.text ?? binding.name.text
    for (const macro of [
      'defineProps',
      'withDefaults',
      'defineExpose',
      'defineOptions',
    ] as const) {
      if (
        setup &&
        options.macros[macro].includes(name) &&
        (name === macro || !binding)
      )
        return macro
    }
    if (
      binding &&
      ts.isVariableDeclaration(binding) &&
      binding.initializer &&
      !mutated.has(binding)
    ) {
      const list = parents.get(binding)
      if (
        list &&
        ts.isVariableDeclarationList(list) &&
        list.flags & ts.NodeFlags.Const
      ) {
        const api = apiFor(binding.initializer, seen)
        if (
          api &&
          ['createComponent', 'createPage', 'onReactHooksExec'].includes(api)
        )
          return api
      }
    }
    if (binding) return
    if (options.reactHooks.includes(name)) return 'onReactHooksExec'
    if (options.optionsComponentCtor.includes(name)) return 'createComponent'
    if (options.optionsPageCtor.includes(name)) return 'createPage'
  }

  function key(name: ts.PropertyName) {
    if (
      ts.isIdentifier(name) ||
      ts.isStringLiteralLike(name) ||
      ts.isNumericLiteral(name)
    )
      return name.text
    const expression = ts.isComputedPropertyName(name)
      ? localValue(name.expression, new Set())
      : undefined
    if (expression && ts.isStringLiteralLike(expression)) return expression.text
  }

  function properties(
    node: ts.Node | undefined,
    seen = new Set<ts.Node>(),
  ): Map<string, { name: ts.Node; value?: ts.Node }> | undefined {
    const result = new Map<string, { name: ts.Node; value?: ts.Node }>()
    if (!node) return
    node = localValue(node, seen)
    if (!node || !ts.isObjectLiteralExpression(node) || seen.has(node)) return
    seen.add(node)
    for (const property of node.properties) {
      if (ts.isSpreadAssignment(property)) {
        const spread = properties(property.expression, new Set(seen))
        // Unknown spreads can replace option section values, but cannot remove
        // an already present public key such as data.
        if (spread) for (const [name, entry] of spread) result.set(name, entry)
        else for (const entry of result.values()) entry.value = undefined
      } else if (property.name) {
        const name = key(property.name)
        if (name !== undefined)
          result.set(name, {
            name: ts.isComputedPropertyName(property.name)
              ? property.name.expression
              : property.name,
            value: ts.isPropertyAssignment(property)
              ? property.initializer
              : ts.isShorthandPropertyAssignment(property)
                ? property.name
                : property,
          })
        else for (const entry of result.values()) entry.value = undefined
      }
    }
    return result
  }

  function checkObject(node: ts.Node | undefined) {
    const data = properties(node)?.get('data')
    if (data) found.add(data.name)
  }

  function checkType(node: ts.Node | undefined, seen = new Set<ts.Node>()) {
    if (!node || seen.has(node)) return
    seen.add(node)
    if (ts.isTypeReferenceNode(node) && ts.isIdentifier(node.typeName)) {
      const declaration = resolve(node.typeName, true)
      if (declaration) checkType(declaration, seen)
    } else if (ts.isTypeAliasDeclaration(node)) checkType(node.type, seen)
    else if (ts.isInterfaceDeclaration(node) || ts.isTypeLiteralNode(node)) {
      for (const member of node.members)
        if (member.name && key(member.name) === 'data') found.add(member.name)
    }
  }

  function functionValue(node: ts.Node | undefined) {
    return node && localValue(node, new Set())
  }

  function checkReturns(node: ts.Node | undefined) {
    const fn = functionValue(node)
    if (
      !fn ||
      !(
        ts.isArrowFunction(fn) ||
        ts.isFunctionExpression(fn) ||
        ts.isFunctionDeclaration(fn) ||
        ts.isMethodDeclaration(fn)
      ) ||
      !fn.body ||
      fn.modifiers?.some(mod => mod.kind === ts.SyntaxKind.AsyncKeyword) ||
      fn.asteriskToken
    )
      return
    if (!ts.isBlock(fn.body)) checkObject(fn.body)
    else walk(fn.body)
    function walk(node: ts.Node) {
      if (ts.isFunctionLike(node) || ts.isClassLike(node)) return
      if (ts.isReturnStatement(node)) checkObject(node.expression)
      else ts.forEachChild(node, walk)
    }
  }

  function checkOptions(node: ts.Node | undefined, fromMacro: boolean) {
    const fields = properties(node)
    if (!fields) return
    for (const name of [
      'props',
      'properties',
      'data',
      'dataFn',
      'computed',
      'methods',
      'inject',
    ]) {
      // Mpx ignores defineOptions.properties when defineProps is present.
      if (fromMacro && name === 'properties' && hasDefineProps) continue
      const value = fields.get(name)?.value
      if (name === 'data' || name === 'dataFn') checkReturns(value)
      if (name !== 'dataFn') checkObject(value)
      if (name === 'inject' && value) {
        const array = localValue(value, new Set())
        if (array && ts.isArrayLiteralExpression(array)) {
          for (const element of array.elements)
            if (ts.isStringLiteralLike(element) && element.text === 'data')
              found.add(element)
        }
      }
    }
    if (fromMacro) {
      setupHookFallback = fields.get('reactHooksExec')?.value
      return
    }
    const setupValue = fields.get('setup')?.value
    checkReturns(setupValue)
    const fn = functionValue(setupValue)
    if (
      fn &&
      (ts.isMethodDeclaration(fn) ||
        ts.isFunctionExpression(fn) ||
        ts.isFunctionDeclaration(fn) ||
        ts.isArrowFunction(fn)) &&
      fn.body
    ) {
      if (
        fn.modifiers?.some(mod => mod.kind === ts.SyntaxKind.AsyncKeyword) ||
        fn.asteriskToken
      )
        return
      checkFinalHook(fn.body, fields.get('reactHooksExec')?.value)
    } else if (!fields.has('setup'))
      checkFinalHook(undefined, fields.get('reactHooksExec')?.value)
  }

  function checkFinalHook(
    body: ts.Node | undefined,
    fallback: ts.Node | undefined,
  ) {
    let selected = fallback
    let uncertain = false
    let mayHaveReturned = false
    if (body) visit(body)
    if (!uncertain) checkReturns(selected)

    function visit(node: ts.Node, guarded = false) {
      if (ts.isFunctionLike(node) || ts.isClassLike(node)) return
      const conditional =
        guarded ||
        ts.isIfStatement(node) ||
        ts.isConditionalExpression(node) ||
        ts.isSwitchStatement(node) ||
        ts.isTryStatement(node) ||
        ts.isIterationStatement(node, false) ||
        (ts.isBinaryExpression(node) &&
          [
            ts.SyntaxKind.AmpersandAmpersandToken,
            ts.SyntaxKind.BarBarToken,
            ts.SyntaxKind.QuestionQuestionToken,
          ].includes(node.operatorToken.kind))
      if (ts.isBlock(node) || ts.isSourceFile(node)) {
        for (const statement of node.statements) {
          visit(statement, conditional)
          if (ts.isReturnStatement(statement) || ts.isThrowStatement(statement))
            break
        }
        return
      }
      ts.forEachChild(node, child => visit(child, conditional))
      if (ts.isCallExpression(node)) {
        const api = getApi(node)
        if (api === 'onReactHooksExec') {
          const argument = node.arguments[0]
          if (!argument) return
          const value = functionValue(argument)
          // injectHook ignores values that are definitely not functions.
          if (
            value &&
            (ts.isObjectLiteralExpression(value) ||
              ts.isArrayLiteralExpression(value) ||
              ts.isLiteralExpression(value) ||
              [
                ts.SyntaxKind.TrueKeyword,
                ts.SyntaxKind.FalseKeyword,
                ts.SyntaxKind.NullKeyword,
              ].includes(value.kind))
          )
            return
          if (conditional || mayHaveReturned || conditionallyCompiled(node))
            uncertain = true
          else {
            selected = argument
            uncertain = false
          }
        } else if (!api) uncertain = true
      }
      if (ts.isReturnStatement(node) || ts.isThrowStatement(node))
        mayHaveReturned = true
    }
  }

  function conditionallyCompiled(node: ts.Node) {
    if (!conditionalRanges) {
      conditionalRanges = []
      const scanner = ts.createScanner(
        ts.ScriptTarget.Latest,
        false,
        ts.LanguageVariant.Standard,
        ast.text,
      )
      let depth = 0
      let start = 0
      for (
        let token = scanner.scan();
        token !== ts.SyntaxKind.EndOfFileToken;
        token = scanner.scan()
      ) {
        if (
          token !== ts.SyntaxKind.SingleLineCommentTrivia &&
          token !== ts.SyntaxKind.MultiLineCommentTrivia
        )
          continue
        const directive = scanner
          .getTokenText()
          .match(/^\/[/\*]\s*@mpx-(if|endif)\b/)
        if (directive?.[1] === 'if' && depth++ === 0)
          start = scanner.getTokenPos()
        if (directive?.[1] === 'endif' && depth && --depth === 0)
          conditionalRanges.push([start, scanner.getTextPos()])
      }
      if (depth) conditionalRanges.push([start, ast.text.length])
    }
    return conditionalRanges.some(
      ([start, end]) => node.getStart(ast) >= start && node.end <= end,
    )
  }
}
