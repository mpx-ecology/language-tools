import type { IRequests } from '@mpxjs/typescript-plugin/src/requests'
import type {
  LanguageServiceContext,
  LanguageServicePlugin,
} from '@volar/language-service'
// import type * as vscode from 'vscode-languageserver-protocol'
import type * as ts from 'typescript'
import { URI } from 'vscode-uri'
import { MpxVirtualCode } from '@mpxjs/language-core'

export function create(
  _ts: typeof import('typescript'),
  getTsPluginClient: (context: LanguageServiceContext) => IRequests | undefined,
): LanguageServicePlugin {
  return {
    name: 'mpx-json-js',

    capabilities: {
      diagnosticProvider: {
        interFileDependencies: true,
        workspaceDiagnostics: false,
      },
    },

    create(context) {
      if (!context.project.mpx) {
        return {}
      }

      const tsPluginClient = getTsPluginClient?.(context)

      return {
        async provideDiagnostics(document) {
          if (!tsPluginClient || document.languageId !== 'javascript') {
            return
          }

          const uri = URI.parse(document.uri)
          const decoded = context.decodeEmbeddedDocumentUri(uri)

          if (!decoded) {
            return
          }

          const [sourceFileId, embeddedCodeId] = decoded
          const sourceScript = context.language.scripts.get(sourceFileId)

          const root = sourceScript?.generated?.root
          if (!(root instanceof MpxVirtualCode)) {
            return
          }

          if (embeddedCodeId !== 'json_js') {
            return
          }

          // const jsonJsCode =
          //   sourceScript?.generated?.embeddedCodes.get(embeddedCodeId)

          try {
            // 获取语义诊断
            const tsDiagnostics: ts.Diagnostic[] | null | undefined =
              await tsPluginClient?.getSemanticDiagnostics(
                root.fileName,
                embeddedCodeId,
              )

            if (!tsDiagnostics || !Array.isArray(tsDiagnostics)) {
              return []
            }

            return []
          } catch (error) {
            console.error('[Mpx] Error providing json-js diagnostics:', error)
            return []
          }
        },
      }
    },
  }
}
