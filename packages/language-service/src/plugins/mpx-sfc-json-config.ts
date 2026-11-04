import type * as ts from 'typescript'
import type { LanguageServicePlugin } from '@volar/language-service'
import { URI } from 'vscode-uri'
import { MpxDiagnosticCode } from '@mpxjs/language-shared'
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
          for (const { name, value } of data.values) {
            const schema = propertySchema(name)
            if (!schema) continue
            const type = literalType(ts, value)
            if (type === undefined) continue
            const actual = literalValue(ts, value)
            const enumValues = name === 'component' ? undefined : schema.enum
            const expected =
              enumValues?.map(v => JSON.stringify(v)).join(' | ') ?? schema.type
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
                code: MpxDiagnosticCode.JsonConfigValue,
                message: `配置 ${name} 应为 ${expected}。`,
              })
            }
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
  const values: { name: string; value: ts.Expression }[] = []
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
  if (shadowed) return { ast, objects, values }
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
  const exportValues = ast.statements.flatMap(statement => {
    if (!ts.isExpressionStatement(statement)) return []
    const expression = unwrap(statement.expression)
    return ts.isBinaryExpression(expression) &&
      expression.operatorToken.kind === ts.SyntaxKind.EqualsToken &&
      isExports(expression.left)
      ? [expression.right]
      : []
  })
  const objectHints = new Map<
    ts.ObjectLiteralExpression,
    (typeof objects)[number]
  >()
  let current: { validate: boolean; fields: Map<string, ts.Expression> }[] = []
  for (const statement of ast.statements) {
    const expression = ts.isExpressionStatement(statement)
      ? unwrap(statement.expression)
      : undefined
    if (expression && ts.isBinaryExpression(expression)) {
      if (
        expression.operatorToken.kind === ts.SyntaxKind.EqualsToken &&
        isExports(expression.left)
      ) {
        current = collect(expression.right).map(({ node, validate }) => ({
          validate,
          fields: fieldsOf(node),
        }))
        continue
      }
      const field = exportField(expression.left)
      if (
        field &&
        expression.operatorToken.kind >= ts.SyntaxKind.FirstAssignment &&
        expression.operatorToken.kind <= ts.SyntaxKind.LastAssignment
      ) {
        if (
          contains(
            expression,
            node => ts.isCallExpression(node) || ts.isNewExpression(node),
          ) ||
          contains(expression.right, isExports)
        ) {
          current.forEach(state => (state.validate = false))
        } else {
          for (const state of current) {
            if (field.name === undefined) state.fields.clear()
            else if (
              expression.operatorToken.kind === ts.SyntaxKind.EqualsToken
            )
              state.fields.set(field.name, expression.right)
            else state.fields.delete(field.name)
          }
        }
        continue
      }
    }
    if (expression && ts.isDeleteExpression(expression)) {
      const field = exportField(expression.expression)
      if (field) {
        for (const state of current) {
          if (field.name === undefined) state.fields.clear()
          else state.fields.delete(field.name)
        }
        continue
      }
    }
    // Aliases, conditional writes and calls can mutate the final object. A later
    // fresh export can reestablish a known value; do not execute arbitrary JS.
    if (
      contains(
        statement,
        node =>
          isExports(node) ||
          ts.isCallExpression(node) ||
          ts.isNewExpression(node),
      )
    ) {
      current.forEach(state => (state.validate = false))
    }
  }
  const emitted = new Set<string>()
  for (const state of current) {
    if (!state.validate) continue
    for (const [name, value] of state.fields) {
      const id = `${name}:${value.pos}:${value.end}`
      if (!emitted.has(id)) {
        emitted.add(id)
        values.push({ name, value })
      }
    }
  }
  return { ast, objects, values }

  function unwrap(expression: ts.Expression): ts.Expression {
    while (ts.isParenthesizedExpression(expression))
      expression = expression.expression
    return expression
  }
  function staticName(expression: ts.Expression) {
    expression = unwrap(expression)
    return ts.isStringLiteralLike(expression) ? expression.text : undefined
  }
  function isExports(node: ts.Node): boolean {
    if (ts.isParenthesizedExpression(node)) return isExports(node.expression)
    if (
      !ts.isPropertyAccessExpression(node) &&
      !ts.isElementAccessExpression(node)
    )
      return false
    const owner = unwrap(node.expression)
    return (
      ts.isIdentifier(owner) &&
      owner.text === 'module' &&
      (ts.isPropertyAccessExpression(node)
        ? node.name.text === 'exports'
        : !!node.argumentExpression &&
          staticName(node.argumentExpression) === 'exports')
    )
  }
  function exportField(expression: ts.Expression) {
    expression = unwrap(expression)
    if (
      ts.isPropertyAccessExpression(expression) &&
      isExports(expression.expression)
    )
      return { name: expression.name.text as string | undefined }
    if (
      ts.isElementAccessExpression(expression) &&
      isExports(expression.expression)
    )
      return {
        name:
          expression.argumentExpression &&
          staticName(expression.argumentExpression),
      }
  }
  function contains(
    node: ts.Node,
    predicate: (node: ts.Node) => boolean,
  ): boolean {
    if (ts.isFunctionLike(node)) return false
    return (
      predicate(node) ||
      !!ts.forEachChild(node, child => contains(child, predicate) || undefined)
    )
  }
  function fieldsOf(node: ts.ObjectLiteralExpression) {
    const fields = new Map<string, ts.Expression>()
    for (const property of node.properties) {
      if (
        ts.isSpreadAssignment(property) ||
        (property.name && ts.isComputedPropertyName(property.name))
      )
        fields.clear()
      else if (property.name) {
        const name = key(property.name)
        if (ts.isPropertyAssignment(property))
          fields.set(name, property.initializer)
        else fields.delete(name)
      }
    }
    return fields
  }
  function collect(
    expression: ts.Expression,
    validate = true,
    seen = new Set<ts.Node>(),
  ): typeof objects {
    expression = unwrap(expression)
    if (seen.has(expression)) return []
    seen.add(expression)
    if (ts.isConditionalExpression(expression))
      return [
        ...collect(expression.whenTrue, validate, new Set(seen)),
        ...collect(expression.whenFalse, validate, new Set(seen)),
      ]
    if (ts.isObjectLiteralExpression(expression)) {
      let hint = objectHints.get(expression)
      if (!hint) {
        hint = { node: expression, validate }
        objectHints.set(expression, hint)
        objects.push(hint)
      }
      return [{ node: expression, validate }]
    }
    if (ts.isIdentifier(expression)) {
      const declaration = constants.get(expression.text)
      if (!declaration?.initializer) return []
      let safe = true
      const name = expression.text
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
      return collect(declaration.initializer, validate && safe, seen)
    }
    return []
  }
}
