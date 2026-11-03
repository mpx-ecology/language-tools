import type * as ts from 'typescript'
import type { LanguageServicePlugin } from '@volar/language-service'
import { URI } from 'vscode-uri'
import {
  CompletionItemKind,
  DiagnosticSeverity,
  MarkupKind,
} from 'vscode-languageserver-protocol'
import type { Diagnostic } from 'vscode-languageserver-protocol'
import type { TextDocument } from 'vscode-languageserver-textdocument'
import mpxJsonSchema from '../data/mpxJsonSchema'

interface PropertySchema {
  type: string
  enum?: unknown[]
  markdownDescription: string
}
const properties: Record<string, PropertySchema> = mpxJsonSchema.properties
const propertySchema = (name: string) =>
  Object.hasOwn(properties, name) ? properties[name] : undefined

/** Adds schema guidance without annotating or evaluating the user's JS. */
export function create(ts: typeof import('typescript')): LanguageServicePlugin {
  return {
    name: 'mpx-json-config',
    capabilities: {
      completionProvider: { triggerCharacters: [':', '"', "'"] },
      hoverProvider: true,
      diagnosticProvider: {
        interFileDependencies: false,
        workspaceDiagnostics: false,
      },
    },
    create(context) {
      const cache = new WeakMap<
        TextDocument,
        { version: number; data: ReturnType<typeof analyze> }
      >()
      function get(document: TextDocument) {
        const decoded = context.decodeEmbeddedDocumentUri(
          URI.parse(document.uri),
        )
        // Share #142's semantic view so Volar can combine schema candidates
        // with JS completions; a second raw view would be skipped or duplicate.
        if (decoded?.[1] !== 'json_service') return
        let result = cache.get(document)
        if (!result || result.version !== document.version) {
          result = {
            version: document.version,
            data: analyze(ts, document.getText()),
          }
          cache.set(document, result)
        }
        return result.data
      }
      return {
        isAdditionalCompletion: true,
        provideCompletionItems(document, position) {
          const data = get(document)
          if (!data) return
          const offset = document.offsetAt(position)
          const object = data.objects.find(
            ({ node }) =>
              node.getStart(data.ast) < offset &&
              (offset < node.end ||
                (offset >= node.end &&
                  document.getText()[node.end - 1] !== '}' &&
                  !document.getText().slice(node.end, offset).trim())),
          )?.node
          if (!object) return
          // Comments never receive config candidates, including value trivia.
          const scanner = ts.createScanner(
            ts.ScriptTarget.Latest,
            false,
            ts.LanguageVariant.Standard,
            document.getText(),
          )
          scanner.setTextPos(object.getStart(data.ast) + 1)
          for (
            let token = scanner.scan();
            token !== ts.SyntaxKind.EndOfFileToken &&
            scanner.getTokenPos() < offset;
            token = scanner.scan()
          ) {
            if (
              offset <= scanner.getTextPos() &&
              (token === ts.SyntaxKind.SingleLineCommentTrivia ||
                token === ts.SyntaxKind.MultiLineCommentTrivia)
            )
              return
          }
          const property = object.properties.find(
            p =>
              p.getStart(data.ast) <= offset &&
              (offset <= p.end ||
                (ts.isPropertyAssignment(p) &&
                  !p.initializer.getWidth(data.ast) &&
                  !document.getText().slice(p.end, offset).trim())),
          )
          const range = (start: number, end: number) => ({
            start: document.positionAt(start),
            end: document.positionAt(end),
          })
          if (
            property &&
            ts.isPropertyAssignment(property) &&
            offset > property.name.end
          ) {
            const schema = propertySchema(key(property.name))
            if (!schema) return
            const value = property.initializer
            // Never offer schema values in a function call or member expression.
            if (
              value.getWidth(data.ast) &&
              literalType(ts, value) === undefined
            )
              return
            const values =
              schema.type === 'boolean' ? [true, false] : (schema.enum ?? [])
            return {
              isIncomplete: false,
              items: values.map(candidate => ({
                label: JSON.stringify(candidate),
                kind: CompletionItemKind.Value,
                textEdit: {
                  range: range(
                    value.getWidth(data.ast)
                      ? value.getStart(data.ast)
                      : offset,
                    value.getWidth(data.ast) ? value.end : offset,
                  ),
                  newText: JSON.stringify(candidate),
                },
                documentation: {
                  kind: MarkupKind.Markdown,
                  value: schema.markdownDescription,
                },
              })),
            }
          }
          if (
            property &&
            !ts.isShorthandPropertyAssignment(property) &&
            !(ts.isPropertyAssignment(property) && offset <= property.name.end)
          )
            return
          const existing = new Set(
            object.properties
              .filter(p => p !== property && p.name)
              .map(p => key(p.name!)),
          )
          const start = property?.name?.getStart(data.ast) ?? offset
          const end = property?.name?.end ?? offset
          return {
            isIncomplete: false,
            items: Object.entries(properties)
              .filter(([name]) => !existing.has(name))
              .map(([name, schema]) => ({
                label: name,
                kind: CompletionItemKind.Property,
                detail: schema.type,
                documentation: {
                  kind: MarkupKind.Markdown,
                  value: schema.markdownDescription,
                },
                textEdit: {
                  range: range(start, end),
                  newText:
                    property && ts.isPropertyAssignment(property)
                      ? name
                      : `${name}: `,
                },
              })),
          }
        },
        provideHover(document, position) {
          const data = get(document)
          if (!data) return
          const offset = document.offsetAt(position)
          for (const { node } of data.objects) {
            for (const property of node.properties) {
              if (
                !property.name ||
                offset < property.name.getStart(data.ast) ||
                offset > property.name.end
              )
                continue
              const name = key(property.name)
              const schema = propertySchema(name)
              if (schema)
                return {
                  range: {
                    start: document.positionAt(
                      property.name.getStart(data.ast),
                    ),
                    end: document.positionAt(property.name.end),
                  },
                  contents: {
                    kind: MarkupKind.Markdown,
                    value: `\`\`\`ts\n${name}: ${schema.type === 'boolean' ? 'boolean' : (schema.enum?.map(v => JSON.stringify(v)).join(' | ') ?? schema.type)}\n\`\`\`\n\n${schema.markdownDescription}`,
                  },
                }
            }
          }
        },
        provideDiagnostics(document) {
          const data = get(document)
          if (!data) return
          const diagnostics: Diagnostic[] = []
          for (const { node, validate } of data.objects) {
            if (!validate) continue
            node.properties.forEach((property, index) => {
              if (!ts.isPropertyAssignment(property)) return
              const name = key(property.name)
              const schema = propertySchema(name)
              if (!schema) return
              // Later spreads/duplicate keys may replace the apparent value.
              if (
                node.properties
                  .slice(index + 1)
                  .some(
                    p =>
                      ts.isSpreadAssignment(p) ||
                      (p.name &&
                        (ts.isComputedPropertyName(p.name) ||
                          key(p.name) === name)),
                  )
              )
                return
              const value = property.initializer
              const type = literalType(ts, value)
              if (type === undefined) return
              const actual = literalValue(ts, value)
              // Unknown file roles must not turn a boolean component switch
              // into a required literal true declaration.
              const enumValues = name === 'component' ? undefined : schema.enum
              const expected =
                enumValues?.map(v => JSON.stringify(v)).join(' | ') ??
                schema.type
              if (
                type !== schema.type ||
                (enumValues && !enumValues.includes(actual))
              ) {
                diagnostics.push({
                  range: {
                    start: document.positionAt(value.getStart(data.ast)),
                    end: document.positionAt(value.end),
                  },
                  severity: DiagnosticSeverity.Warning,
                  source: 'mpx-json-schema',
                  code: 'config-value',
                  message: `配置 ${name} 应为 ${expected}。`,
                })
              }
            })
          }
          return diagnostics
        },
      }
    },
  }
}

function key(name: ts.PropertyName): string {
  return 'text' in name ? String(name.text) : ''
}

function literalType(
  ts: typeof import('typescript'),
  value: ts.Expression,
): string | undefined {
  if (ts.isStringLiteral(value) || ts.isNoSubstitutionTemplateLiteral(value))
    return 'string'
  if (
    ts.isNumericLiteral(value) ||
    (ts.isPrefixUnaryExpression(value) &&
      [ts.SyntaxKind.PlusToken, ts.SyntaxKind.MinusToken].includes(
        value.operator,
      ) &&
      ts.isNumericLiteral(value.operand))
  )
    return 'number'
  if (
    value.kind === ts.SyntaxKind.TrueKeyword ||
    value.kind === ts.SyntaxKind.FalseKeyword
  )
    return 'boolean'
  if (value.kind === ts.SyntaxKind.NullKeyword) return 'null'
  if (ts.isObjectLiteralExpression(value)) return 'object'
  if (ts.isArrayLiteralExpression(value)) return 'array'
}

function literalValue(
  ts: typeof import('typescript'),
  value: ts.Expression,
): unknown {
  if (ts.isStringLiteral(value) || ts.isNoSubstitutionTemplateLiteral(value))
    return value.text
  if (value.kind === ts.SyntaxKind.TrueKeyword) return true
  if (value.kind === ts.SyntaxKind.FalseKeyword) return false
}

function analyze(ts: typeof import('typescript'), text: string) {
  const ast = ts.createSourceFile(
    'config.js',
    text,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.JS,
  )
  const objects: { node: ts.ObjectLiteralExpression; validate: boolean }[] = []
  const constants = new Map<string, ts.VariableDeclaration>()
  let shadowed = false
  function checkModule(node: ts.Node) {
    // Function-local CommonJS lookalikes do not change this module's binding.
    if (ts.isFunctionLike(node)) {
      if (
        node.name &&
        ts.isIdentifier(node.name) &&
        node.name.text === 'module'
      )
        shadowed = true
      return
    }
    if (
      (ts.isVariableDeclaration(node) ||
        ts.isBindingElement(node) ||
        ts.isImportClause(node) ||
        ts.isImportSpecifier(node) ||
        ts.isNamespaceImport(node) ||
        ts.isClassDeclaration(node)) &&
      node.name &&
      ts.isIdentifier(node.name) &&
      node.name.text === 'module'
    )
      shadowed = true
    if (
      ts.isBinaryExpression(node) &&
      node.operatorToken.kind >= ts.SyntaxKind.FirstAssignment &&
      node.operatorToken.kind <= ts.SyntaxKind.LastAssignment &&
      ts.isIdentifier(node.left) &&
      node.left.text === 'module'
    )
      shadowed = true
    ts.forEachChild(node, checkModule)
  }
  checkModule(ast)
  if (shadowed) return { ast, objects }
  for (const statement of ast.statements) {
    if (ts.isVariableStatement(statement)) {
      for (const declaration of statement.declarationList.declarations) {
        if (ts.isIdentifier(declaration.name)) {
          if (statement.declarationList.flags & ts.NodeFlags.Const)
            constants.set(declaration.name.text, declaration)
        }
      }
    }
  }
  const exportValues: ts.Expression[] = []
  for (const statement of ast.statements) {
    if (
      !ts.isExpressionStatement(statement) ||
      !ts.isBinaryExpression(statement.expression)
    )
      continue
    const { left, right, operatorToken } = statement.expression
    if (operatorToken.kind !== ts.SyntaxKind.EqualsToken) continue
    if (ts.isIdentifier(left) && left.text === 'module') return { ast, objects }
    if (
      ts.isPropertyAccessExpression(left) &&
      ts.isIdentifier(left.expression) &&
      left.expression.text === 'module' &&
      left.name.text === 'exports'
    )
      exportValues.push(right)
  }
  const seen = new Set<ts.Node>()
  function collect(expression: ts.Expression, validate = true) {
    if (seen.has(expression)) return
    seen.add(expression)
    if (ts.isParenthesizedExpression(expression))
      return collect(expression.expression, validate)
    if (ts.isConditionalExpression(expression)) {
      collect(expression.whenTrue, validate)
      collect(expression.whenFalse, validate)
    } else if (ts.isObjectLiteralExpression(expression))
      objects.push({ node: expression, validate })
    else if (ts.isIdentifier(expression)) {
      const declaration = constants.get(expression.text)
      const name = expression.text
      if (!declaration?.initializer) return
      // A const object can still be mutated or escape to arbitrary JS. Keep
      // hints, but validate only objects used exclusively as direct exports.
      let safe = true
      function visit(node: ts.Node) {
        if (
          ts.isIdentifier(node) &&
          node.text === name &&
          node !== declaration!.name &&
          !exportValues.includes(node)
        )
          safe = false
        ts.forEachChild(node, visit)
      }
      visit(ast)
      collect(declaration.initializer, validate && safe)
    }
  }
  exportValues.forEach(value => collect(value))
  return { ast, objects }
}
