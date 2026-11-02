import type { LanguageServicePlugin, Range } from '@volar/language-service'
import {
  MpxVirtualCode,
  formatTemplateDiagnosticMessage,
  isDiagnosticsEnabled,
  shouldFormatTemplateDiagnosticMessage,
} from '@mpxjs/language-core'
import { create as baseCreate } from 'volar-service-typescript/lib/plugins/semantic'
import { URI } from 'vscode-uri'

export function create(
  ts: typeof import('typescript'),
  options?: Parameters<typeof baseCreate>[1],
): LanguageServicePlugin {
  const base = baseCreate(ts, options)
  return {
    ...base,
    create(context) {
      const instance = base.create!(context)!
      if (!instance.provideDiagnostics) return instance
      return {
        ...instance,
        async provideDiagnostics(document, token) {
          const diagnostics = await instance.provideDiagnostics!(
            document,
            token,
          )
          return diagnostics?.map(diagnostic => ({
            ...diagnostic,
            message: format(
              document.uri,
              diagnostic.range,
              diagnostic.message,
              diagnostic.code,
            ),
            ...(diagnostic.relatedInformation && {
              relatedInformation: diagnostic.relatedInformation.map(info => ({
                ...info,
                message: format(
                  info.location.uri,
                  info.location.range,
                  info.message,
                  diagnostic.code,
                ),
              })),
            }),
          }))
        },
      }

      function format(
        uriString: string,
        range: Range,
        message: string,
        diagnosticCode: number | string | undefined,
      ) {
        if (!shouldFormatTemplateDiagnosticMessage(message, diagnosticCode))
          return message
        const uri = URI.parse(uriString)
        const decoded = context.decodeEmbeddedDocumentUri(uri)
        const source = context.language.scripts.get(decoded?.[0] ?? uri)
        const root = source?.generated?.root
        if (!source || !(root instanceof MpxVirtualCode)) return message
        const code = decoded && source.generated!.embeddedCodes.get(decoded[1])
        if (decoded && !code) return message
        const document = context.documents.get(
          uri,
          code ? code.languageId : source.languageId,
          code ? code.snapshot : source.snapshot,
        )
        const start = document.offsetAt(range.start)
        const end = document.offsetAt(range.end)
        if (code) {
          // Message lookup must not execute stateful suppression callbacks.
          // Volar applies shouldReport when mapping the original diagnostic.
          for (const [sourceStart, sourceEnd] of context.language.maps
            .get(code, source)
            .toSourceRange(start, end, true, isDiagnosticsEnabled)) {
            return formatTemplateDiagnosticMessage(
              ts,
              root,
              sourceStart,
              sourceEnd - sourceStart,
              message,
              diagnosticCode,
            )
          }
          return message
        }
        return formatTemplateDiagnosticMessage(
          ts,
          root,
          start,
          end - start,
          message,
          diagnosticCode,
        )
      }
    },
  }
}
