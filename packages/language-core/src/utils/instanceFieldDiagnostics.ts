import type * as ts from 'typescript'
import type { Language } from '@volar/language-core'
import { MpxVirtualCode } from '../virtualFile/mpxFile'

export const duplicateInstanceFieldCode = 5001

// Analyze existing service types without changing generated declarations.
// Diagnostic adapters own the warning mapping; normal TS errors stay intact.
export function getInstanceFieldDiagnostics<T>(
  ts: typeof import('typescript'),
  language: Language<T>,
  scriptId: T,
  program: ts.Program | undefined,
): ts.Diagnostic[] {
  const source = language.scripts.get(scriptId)
  const root = source?.generated?.root
  if (!source || !(root instanceof MpxVirtualCode) || !program) return []
  const options = root.mpxCompilerOptions
  const setup = root.sfc.scriptSetup
  const service =
    source.generated!.languagePlugin.typescript?.getServiceScript(root)
  const file = program.getSourceFile(root.fileName)
  if (!setup || !service || !file) return []
  const checker = program.getTypeChecker()
  const map = language.maps.get(service.code, source)
  // tsserver prefixes virtual code with a source-length padding; standalone
  // Volar uses the service snapshot directly. Both share the same source map.
  const offset = file.text.length - service.code.snapshot.getLength()
  if (offset !== 0 && offset !== source.snapshot.getLength()) return []
  const text = source.snapshot.getText(0, source.snapshot.getLength())
  const original = ts.createSourceFile(
    root.fileName,
    text,
    ts.ScriptTarget.Latest,
  )
  const conditionalRanges: [number, number][] = []
  let conditionalStart: number | undefined
  let depth = 0
  // Build guards from comments only, so strings containing directives are inert.
  const scanner = ts.createScanner(
    ts.ScriptTarget.Latest,
    false,
    ts.LanguageVariant.Standard,
    setup.content,
  )
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
      conditionalStart = scanner.getTokenPos()
    if (directive?.[1] === 'endif' && depth && --depth === 0) {
      conditionalRanges.push([conditionalStart!, scanner.getTextPos()])
    }
  }
  if (depth) conditionalRanges.push([conditionalStart!, setup.content.length])
  const guarded = (start: number) =>
    conditionalRanges.some(([a, b]) => start >= a && start < b)

  type Site = { file: ts.SourceFile; start: number; length: number }
  type Field = { name: string; owner: string; site: Site; origin: Site }
  const fields: Field[] = []
  let props: ts.CallExpression | undefined
  let defineOptions: ts.CallExpression | undefined
  let expose: ts.CallExpression | undefined
  let hooks: ts.CallExpression | undefined
  let uncertainHooks = false

  for (const statement of setup.ast.statements) visit(statement, true)
  if (props) collect(props, 'props', false)
  else collect(defineOptions, 'props', false, 'properties')
  collect(expose, 'defineExpose', false)
  // callHook runs every registered callback but only returns the last result.
  if (!uncertainHooks) collect(hooks, 'onReactHooksExec', true)

  const result: ts.Diagnostic[] = []
  const seen = new Map<string, Field[]>()
  for (const field of fields) {
    const previous = seen.get(field.name) ?? []
    if (previous.length) {
      result.push({
        ...field.site,
        category: ts.DiagnosticCategory.Warning,
        code: duplicateInstanceFieldCode,
        source: 'mpx',
        messageText: `Instance field '${field.name}' from ${field.owner} conflicts with ${previous.map(f => f.owner).join(', ')}.`,
        relatedInformation: [
          ...previous,
          ...(field.site === field.origin ? [] : [field]),
        ].map(other => ({
          ...other.origin,
          category: ts.DiagnosticCategory.Message,
          code: duplicateInstanceFieldCode,
          source: 'mpx',
          messageText: `'${field.name}' is also declared by ${other.owner}.`,
        })),
      })
    }
    seen.set(field.name, [...previous, field])
  }
  return result

  function visit(node: ts.Node, unconditional: boolean) {
    if (ts.isFunctionLike(node) || ts.isClassLike(node)) return
    if (ts.isCallExpression(node)) {
      const name = ts.isIdentifier(node.expression) ? node.expression.text : ''
      const direct = unconditional && !guarded(node.getStart(setup!.ast))
      if (options.macros.defineProps.includes(name) && direct) props = node
      if (options.macros.defineOptions.includes(name) && direct)
        defineOptions = node
      if (options.macros.defineExpose.includes(name) && direct) expose = node
      if (isHooks(node)) {
        if (direct) {
          hooks = node
          uncertainHooks = false
        } else uncertainHooks = true
      }
    }
    const nested =
      ts.isIfStatement(node) ||
      ts.isSwitchStatement(node) ||
      ts.isTryStatement(node) ||
      ts.isIterationStatement(node, false) ||
      ts.isConditionalExpression(node) ||
      (ts.isBinaryExpression(node) &&
        [
          ts.SyntaxKind.AmpersandAmpersandToken,
          ts.SyntaxKind.BarBarToken,
          ts.SyntaxKind.QuestionQuestionToken,
        ].includes(node.operatorToken.kind))
    ts.forEachChild(node, child => visit(child, unconditional && !nested))
  }

  function isHooks(call: ts.CallExpression) {
    const node = generated(call.expression)
    if (!node) return false
    const symbol = checker.getSymbolAtLocation(
      ts.isPropertyAccessExpression(node) ? node.name : node,
    )
    const visited = new Set<ts.Symbol>()
    function isMpxHook(current: ts.Symbol | undefined): boolean {
      if (!current || visited.has(current)) return false
      visited.add(current)
      if (current.flags & ts.SymbolFlags.Alias)
        return isMpxHook(checker.getAliasedSymbol(current))
      if (
        current.name === 'onReactHooksExec' &&
        current.declarations?.some(d =>
          /[/\\]@mpxjs[/\\]core[/\\]/.test(d.getSourceFile().fileName),
        )
      )
        return true
      return (
        current.declarations?.some(declaration => {
          if (
            !ts.isVariableDeclaration(declaration) ||
            !declaration.initializer ||
            !ts.isVariableDeclarationList(declaration.parent) ||
            !(declaration.parent.flags & ts.NodeFlags.Const)
          )
            return false
          const value = declaration.initializer
          if (!ts.isIdentifier(value) && !ts.isPropertyAccessExpression(value))
            return false
          return isMpxHook(
            checker.getSymbolAtLocation(
              ts.isPropertyAccessExpression(value) ? value.name : value,
            ),
          )
        }) ?? false
      )
    }
    if (isMpxHook(symbol)) return true
    // Custom composable names are an explicit project opt-in.
    return (
      ts.isIdentifier(call.expression) &&
      options.reactHooks.includes(call.expression.text) &&
      call.expression.text !== 'onReactHooksExec' &&
      symbol?.declarations?.some(ts.isImportSpecifier) === true
    )
  }

  function generated(node: ts.Node) {
    const start = setup!.startTagEnd + node.getStart(setup!.ast)
    const end = setup!.startTagEnd + node.end
    for (const [a, b] of map.toGeneratedRange(start, end, true)) {
      const find = (current: ts.Node): ts.Node | undefined => {
        if (current.getStart(file) === a + offset && current.end === b + offset)
          return current
        if (current.pos <= a + offset && current.end >= b + offset)
          return ts.forEachChild(current, find)
      }
      const found = find(file!)
      if (found) return found
    }
  }

  function location(node: ts.Node): Site | undefined {
    const sf = node.getSourceFile()
    const name = 'name' in node ? (node as ts.NamedDeclaration).name : undefined
    const target = name ?? node
    // A different virtual SFC needs its own source map; never publish its
    // generated offsets as related source locations.
    if (sf !== file && sf.fileName.endsWith('.mpx')) return
    if (sf !== file)
      return {
        file: sf,
        start: target.getStart(sf),
        length: target.end - target.getStart(sf),
      }
    for (const [a, b] of map.toSourceRange(
      target.getStart(sf) - offset,
      target.end - offset,
      true,
    )) {
      if (guarded(a - setup!.startTagEnd)) return
      return { file: original, start: a, length: b - a }
    }
  }

  function collect(
    call: ts.CallExpression | undefined,
    owner: string,
    callback: boolean,
    property?: string,
  ) {
    const argument = call && (call.arguments[0] ?? call.typeArguments?.[0])
    if (!call || !argument) return
    const node = generated(argument)
    if (!node) return
    let type = checker.getTypeAtLocation(node)
    if (property) {
      const field = checker.getPropertyOfType(type, property)
      if (!field) return
      type = checker.getTypeOfSymbolAtLocation(field, node)
    }
    if (callback) {
      const signatures = type.getCallSignatures()
      if (signatures.length !== 1) return
      type = checker.getReturnTypeOfSignature(signatures[0])
    }
    if (
      type.flags &
      (ts.TypeFlags.Any | ts.TypeFlags.Unknown | ts.TypeFlags.TypeParameter)
    )
      return
    const anchor: Site = {
      file: original,
      start: setup!.startTagEnd + argument.getStart(setup!.ast),
      length: argument.end - argument.getStart(setup!.ast),
    }
    for (const symbol of checker.getPropertiesOfType(type)) {
      // Only concrete, declared public keys; index signatures are never expanded.
      if (symbol.name.startsWith('__@')) continue
      if (owner !== 'props' && symbol.flags & ts.SymbolFlags.Optional) continue
      const declaration = symbol.valueDeclaration ?? symbol.declarations?.[0]
      if (
        !declaration ||
        program!.isSourceFileDefaultLibrary(declaration.getSourceFile())
      )
        continue
      if (
        (ts.isMethodDeclaration(declaration) ||
          ts.isGetAccessorDeclaration(declaration) ||
          ts.isSetAccessorDeclaration(declaration)) &&
        ts.isClassLike(declaration.parent)
      )
        continue
      const site = location(declaration)
      if (!site) continue
      fields.push({
        name: symbol.name,
        owner,
        site: site.file === original ? site : anchor,
        origin: site,
      })
    }
  }
}
