import type { LanguageServicePlugin } from '@volar/language-service'
import type {
  CancellationToken,
  Position,
} from 'vscode-languageserver-protocol'
import { MpxVirtualCode, isRenameEnabled } from '@mpxjs/language-core'
import type { TextDocument } from 'vscode-languageserver-textdocument'
import { URI } from 'vscode-uri'
import { create as createSemantic } from './typescript-semantic'

export function create(
  ts: typeof import('typescript'),
  jsonOnly = true,
  options?: Parameters<typeof createSemantic>[1],
): LanguageServicePlugin {
  const base = createSemantic(ts, {
    disableAutoImportCache: jsonOnly,
    ...options,
  })
  return {
    ...base,
    name: jsonOnly ? 'mpx-json-js' : 'typescript-semantic',
    capabilities: {
      ...base.capabilities,
      // Whole-project operations remain with the IDE's tsserver. This service
      // handles requests originating from an individual JSON virtual document.
      ...(jsonOnly
        ? {
            workspaceSymbolProvider: undefined,
            fileRenameEditsProvider: false,
            fileReferencesProvider: false,
          }
        : {}),
    },
    create(context) {
      const instance = base.create(context)
      function jsonDocument<Args extends unknown[], Result>(
        provider:
          | ((document: TextDocument, ...args: Args) => Result)
          | undefined,
        skip?: (uri: URI, document: TextDocument) => boolean,
      ):
        | ((
            document: TextDocument,
            ...args: Args
          ) => Result | Promise<Awaited<Result>> | undefined)
        | undefined {
        if (!jsonOnly) return provider
        return (
          provider &&
          ((document: TextDocument, ...args: Args) => {
            const decoded = context.decodeEmbeddedDocumentUri(
              URI.parse(document.uri),
            )
            if (decoded?.[1] === 'json_service') {
              if (skip?.(decoded[0], document)) return
              const release = context.project.mpx?.includeJsonScript?.(
                decoded[0],
              )
              try {
                return Promise.resolve(provider(document, ...args)).finally(
                  () => release?.(),
                )
              } catch (error) {
                release?.()
                throw error
              }
            }
          })
        )
      }
      function canSkipDiagnostics(uri: URI, document: TextDocument) {
        const options =
          context.project.typescript?.languageServiceHost.getCompilationSettings()
        if (
          options?.checkJs !== false ||
          options.declaration ||
          options.composite
        )
          return false

        const source = context.language.scripts.get(uri)
        const root = source?.generated?.root
        const code = source?.generated?.embeddedCodes.get('json_service')
        if (
          !(root instanceof MpxVirtualCode) ||
          !code ||
          root.sfc.json?.lang !== 'js'
        )
          return false
        if (
          context.documents.get(
            URI.parse(document.uri),
            code.languageId,
            code.snapshot,
          ) !== document
        )
          return false

        return isUncheckedLiteralConfig(ts, root.sfc.json.ast)
      }
      async function hasSourceDeclaration(
        document: TextDocument,
        position: Position,
        token: CancellationToken,
      ) {
        const decoded = context.decodeEmbeddedDocumentUri(
          URI.parse(document.uri),
        )
        if (decoded?.[1] !== 'json_service') return true
        const source = context.language.scripts.get(decoded[0])
        const code = source?.generated?.embeddedCodes.get(decoded[1])
        if (!source || !code) return false
        const definitions = await instance.provideDefinition?.(
          document,
          position,
          token,
        )
        if (!definitions?.length) return true
        const map = context.language.maps.get(code, source)
        return definitions.some(
          definition =>
            definition.targetUri !== document.uri ||
            !map
              .toSourceRange(
                document.offsetAt(definition.targetSelectionRange.start),
                document.offsetAt(definition.targetSelectionRange.end),
                true,
                isRenameEnabled,
              )
              .next().done,
        )
      }
      return {
        ...instance,
        provideCompletionItems: jsonDocument(instance.provideCompletionItems),
        provideRenameRange: jsonDocument(async (document, position, token) => {
          if (!(await hasSourceDeclaration(document, position, token))) {
            return {
              message:
                'This JSON variable is supplied by Mpx and cannot be renamed.',
            }
          }
          return instance.provideRenameRange?.(document, position, token)
        }),
        provideRenameEdits: jsonDocument(
          async (document, position, newName, token) => {
            if (await hasSourceDeclaration(document, position, token)) {
              return instance.provideRenameEdits?.(
                document,
                position,
                newName,
                token,
              )
            }
          },
        ),
        provideCodeActions: jsonDocument(instance.provideCodeActions),
        provideInlayHints: jsonDocument(instance.provideInlayHints),
        provideCallHierarchyItems: jsonDocument(
          instance.provideCallHierarchyItems,
        ),
        provideDefinition: jsonDocument(instance.provideDefinition),
        provideTypeDefinition: jsonDocument(instance.provideTypeDefinition),
        provideDiagnostics: jsonDocument(
          instance.provideDiagnostics,
          canSkipDiagnostics,
        ),
        provideHover: jsonDocument(instance.provideHover),
        provideImplementation: jsonDocument(instance.provideImplementation),
        provideReferences: jsonDocument(instance.provideReferences),
        provideDocumentHighlights: jsonDocument(
          instance.provideDocumentHighlights,
        ),
        provideSignatureHelp: jsonDocument(instance.provideSignatureHelp),
        provideDocumentSemanticTokens: jsonDocument(
          instance.provideDocumentSemanticTokens,
        ),
        ...(jsonOnly
          ? {
              provideDocumentFormattingEdits: undefined,
              provideOnTypeFormattingEdits: undefined,
              provideWorkspaceSymbols: undefined,
              provideFileRenameEdits: undefined,
              provideFileReferences: undefined,
            }
          : {}),
      }
    },
  }
}

/** The standalone project keeps all TS features, with the same JSON mapping safeguards. */
export function createProject(
  ts: typeof import('typescript'),
  options?: Parameters<typeof createSemantic>[1],
): LanguageServicePlugin {
  return create(ts, false, options)
}

/** A plain unchecked CommonJS literal has no TypeScript diagnostics to add.
 * The Mpx schema and component-path providers still validate its contents.
 */
function isUncheckedLiteralConfig(
  ts: typeof import('typescript'),
  source: import('typescript').SourceFile,
) {
  // Keep pragmas, JSDoc, directives and all nonliteral code on the full service.
  if (/\/[/*]/.test(source.text) || source.statements.length !== 1) return false
  const diagnostics = (
    source as import('typescript').SourceFile & {
      parseDiagnostics?: readonly import('typescript').Diagnostic[]
    }
  ).parseDiagnostics
  if (!diagnostics || diagnostics.length) return false
  const statement = source.statements[0]!
  if (
    !ts.isExpressionStatement(statement) ||
    source.text.slice(0, statement.getStart(source)).trim() ||
    source.text.slice(statement.end).trim()
  )
    return false
  const { expression } = statement
  if (
    !ts.isBinaryExpression(expression) ||
    expression.operatorToken.kind !== ts.SyntaxKind.EqualsToken
  )
    return false
  const { left, right } = expression
  if (
    !ts.isPropertyAccessExpression(left) ||
    left.questionDotToken ||
    !ts.isIdentifier(left.expression) ||
    left.expression.text !== 'module' ||
    left.getText(source) !== 'module.exports' ||
    !ts.isObjectLiteralExpression(right)
  )
    return false
  return isLiteral(right)

  function isLiteral(node: import('typescript').Expression): boolean {
    if (ts.isStringLiteral(node)) return !node.getText(source).includes('\\')
    if (ts.isNumericLiteral(node))
      return /^(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?$/.test(
        node.getText(source),
      )
    if (
      node.kind === ts.SyntaxKind.TrueKeyword ||
      node.kind === ts.SyntaxKind.FalseKeyword ||
      node.kind === ts.SyntaxKind.NullKeyword
    )
      return true
    if (ts.isArrayLiteralExpression(node)) return node.elements.every(isLiteral)
    if (!ts.isObjectLiteralExpression(node)) return false
    const seen = new Set<string>()
    return node.properties.every(prop => {
      if (!ts.isPropertyAssignment(prop)) return false
      const name = prop.name
      if (
        prop.getStart(source) !== name.getStart(source) ||
        source.text
          .slice(name.end, prop.initializer.getStart(source))
          .trim() !== ':'
      )
        return false
      if (!ts.isIdentifier(name) && !ts.isStringLiteral(name)) return false
      if (
        name.text === '__proto__' ||
        seen.has(name.text) ||
        name.getText(source).includes('\\')
      )
        return false
      seen.add(name.text)
      return isLiteral(prop.initializer)
    })
  }
}
