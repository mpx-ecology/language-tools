import type { LanguageServicePlugin } from '@volar/language-service'
import {
  MpxVirtualCode,
  createComponentReferenceIndex,
  isReferencesEnabled,
} from '@mpxjs/language-core'
import { URI } from 'vscode-uri'

/** Standalone LSP bridge. The IDE uses the same index through its TS plugin. */
export function create(ts: typeof import('typescript')): LanguageServicePlugin {
  return {
    name: 'mpx-component-references',
    capabilities: { referencesProvider: true },
    create(context) {
      const componentReferences = createComponentReferenceIndex(
        ts,
        context.language,
        fileName => context.project.typescript!.uriConverter.asUri(fileName),
      )
      function sourceDocument(uriString: string) {
        const decoded = context.decodeEmbeddedDocumentUri(URI.parse(uriString))
        const source = decoded && context.language.scripts.get(decoded[0])
        const code = decoded && source?.generated?.embeddedCodes.get(decoded[1])
        if (
          !source ||
          !code ||
          !(source.generated?.root instanceof MpxVirtualCode)
        )
          return
        return { source, code }
      }
      function locations(
        references: {
          fileName: string
          textSpan: { start: number; length: number }
        }[],
      ) {
        return references.flatMap(reference => {
          const uri = context.project.typescript!.uriConverter.asUri(
            reference.fileName,
          )
          const source = context.language.scripts.get(uri)
          if (!source) return []
          const document = context.documents.get(
            uri,
            source.languageId,
            source.snapshot,
          )
          return [
            {
              uri: uri.toString(),
              range: {
                start: document.positionAt(reference.textSpan.start),
                end: document.positionAt(
                  reference.textSpan.start + reference.textSpan.length,
                ),
              },
            },
          ]
        })
      }
      return {
        async provideFileReferences(document) {
          const current = sourceDocument(document.uri)
          if (current?.code.id === 'root_tags') {
            const program = context
              .inject<{
                'typescript/languageService': () =>
                  | import('typescript').LanguageService
                  | undefined
              }>('typescript/languageService')
              ?.getProgram()
            if (program)
              return locations(
                componentReferences.getFileReferences(
                  program,
                  current.source.id.fsPath,
                ),
              )
          }
          return undefined
        },
        async provideReferences(document, position) {
          const current = sourceDocument(document.uri)
          if (current) {
            const program = context
              .inject<{
                'typescript/languageService': () =>
                  | import('typescript').LanguageService
                  | undefined
              }>('typescript/languageService')
              ?.getProgram()
            if (program) {
              for (const [offset] of context.language.maps
                .get(current.code, current.source)
                .toSourceLocation(
                  document.offsetAt(position),
                  isReferencesEnabled,
                )) {
                const references = componentReferences.getReferencesAtPosition(
                  program,
                  current.source.id.fsPath,
                  offset,
                )
                if (references) return locations(references)
              }
            }
          }
          return undefined
        },
      }
    },
  }
}
