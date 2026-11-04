import type { Diagnostic, LanguageServicePlugin } from '@volar/language-service'
import {
  MpxVirtualCode,
  getInstanceFieldDiagnostics,
} from '@mpxjs/language-core'
import { URI } from 'vscode-uri'

export function create(ts: typeof import('typescript')): LanguageServicePlugin {
  return {
    name: 'mpx-instance-fields',
    capabilities: {
      diagnosticProvider: {
        interFileDependencies: true,
        workspaceDiagnostics: false,
      },
    },
    create(context) {
      return {
        provideDiagnostics(document) {
          if (document.languageId !== 'mpx-instance-fields') return
          const decoded = context.decodeEmbeddedDocumentUri(
            URI.parse(document.uri),
          )
          if (!decoded) return
          const source = context.language.scripts.get(decoded[0])
          const root = source?.generated?.root
          if (!(root instanceof MpxVirtualCode) || !root.sfc.scriptSetup) return
          // Hybrid JSON-only hosts deliberately omit the business TS script.
          // Do not start their separate Program for an ordinary setup request.
          if (
            !source?.generated?.languagePlugin.typescript?.getServiceScript(
              root,
            )
          )
            return
          const scriptOffset = root.sfc.scriptSetup.startTagEnd
          // In hybrid mode tsserver owns semantic diagnostics; this provider is
          // active only when the standalone TypeScript service is available.
          const service = context.inject('typescript/languageService')
          if (!service) return
          return getInstanceFieldDiagnostics(
            ts,
            context.language,
            decoded[0],
            service.getProgram(),
          ).map(
            diagnostic =>
              ({
                range: {
                  start: document.positionAt(diagnostic.start! - scriptOffset),
                  end: document.positionAt(
                    diagnostic.start! + diagnostic.length! - scriptOffset,
                  ),
                },
                severity: 2,
                source: 'mpx',
                code: diagnostic.code,
                message: String(diagnostic.messageText),
                relatedInformation: diagnostic.relatedInformation?.map(
                  info => ({
                    location: {
                      uri: URI.file(info.file!.fileName).toString(),
                      range: {
                        start: info.file!.getLineAndCharacterOfPosition(
                          info.start!,
                        ),
                        end: info.file!.getLineAndCharacterOfPosition(
                          info.start! + info.length!,
                        ),
                      },
                    },
                    message: String(info.messageText),
                  }),
                ),
              }) satisfies Diagnostic,
          )
        },
      }
    },
  }
}
