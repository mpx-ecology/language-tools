import type { LanguageServicePlugin } from '@volar/language-service'
import type {
  CancellationToken,
  Position,
} from 'vscode-languageserver-protocol'
import { isRenameEnabled } from '@mpxjs/language-core'
import type { TextDocument } from 'vscode-languageserver-textdocument'
import { URI } from 'vscode-uri'
import { create as createSemantic } from 'volar-service-typescript/lib/plugins/semantic'

export function create(
  ts: typeof import('typescript'),
  jsonOnly = true,
): LanguageServicePlugin {
  const base = createSemantic(ts, { disableAutoImportCache: jsonOnly })
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
      ) {
        if (!jsonOnly) return provider
        return (
          provider &&
          ((document: TextDocument, ...args: Args) => {
            const decoded = context.decodeEmbeddedDocumentUri(
              URI.parse(document.uri),
            )
            if (decoded?.[1] === 'json_service')
              return provider(document, ...args)
          })
        )
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
        provideDiagnostics: jsonDocument(instance.provideDiagnostics),
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
): LanguageServicePlugin {
  return create(ts, false)
}
