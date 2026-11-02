import type * as ts from 'typescript'
import {
  type Language,
  MpxVirtualCode,
  formatTemplateDiagnosticMessage,
} from '@mpxjs/language-core'

export function transformTemplateDiagnostic<T, D extends ts.Diagnostic>(
  ts: typeof import('typescript'),
  language: Language<T>,
  asScriptId: (fileName: string) => T,
  diagnostic: D,
): D {
  const root =
    diagnostic.file &&
    language.scripts.get(
      asScriptId(diagnostic.file.fileName.replace(/\\/g, '/')),
    )?.generated?.root
  const format = (message: string, code = diagnostic.code) =>
    root instanceof MpxVirtualCode &&
    diagnostic.start !== undefined &&
    diagnostic.length !== undefined
      ? formatTemplateDiagnosticMessage(
          ts,
          root,
          diagnostic.start,
          diagnostic.length,
          message,
          code,
        )
      : message
  function formatChain(
    chain: ts.DiagnosticMessageChain,
  ): ts.DiagnosticMessageChain {
    return {
      ...chain,
      messageText: format(chain.messageText, chain.code),
      ...(chain.next && { next: chain.next.map(formatChain) }),
    }
  }
  return {
    ...diagnostic,
    messageText:
      typeof diagnostic.messageText === 'string'
        ? format(diagnostic.messageText)
        : formatChain(diagnostic.messageText),
    ...(diagnostic.relatedInformation && {
      relatedInformation: diagnostic.relatedInformation.map(info =>
        transformTemplateDiagnostic(ts, language, asScriptId, info),
      ),
    }),
  }
}
