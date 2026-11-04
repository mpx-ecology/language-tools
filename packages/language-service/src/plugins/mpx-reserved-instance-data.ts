import type { LanguageServicePlugin } from '@volar/language-service'
import { MpxVirtualCode } from '@mpxjs/language-core'
import { URI } from 'vscode-uri'
import { MpxDiagnosticCode } from '@mpxjs/language-shared'
import { getReservedInstanceDataRanges } from '../utils/reservedInstanceData'

export function create(ts: typeof import('typescript')): LanguageServicePlugin {
  return {
    name: 'mpx-reserved-instance-data',
    capabilities: {
      diagnosticProvider: {
        interFileDependencies: false,
        workspaceDiagnostics: false,
      },
    },
    create(context) {
      return {
        provideDiagnostics(document) {
          // The main Mpx document has an identity mapping. Do not duplicate
          // warnings on generated TS, raw scripts or root-tag HTML mappings.
          if (document.languageId !== 'mpx') return
          const decoded = context.decodeEmbeddedDocumentUri(
            URI.parse(document.uri),
          )
          const root =
            decoded && context.language.scripts.get(decoded[0])?.generated?.root
          if (!(root instanceof MpxVirtualCode) || decoded?.[1] !== root.id)
            return
          return [root.sfc.script, root.sfc.scriptSetup].flatMap(block => {
            if (!block) return []
            return getReservedInstanceDataRanges(
              ts,
              block.ast,
              block === root.sfc.scriptSetup,
              root.mpxCompilerOptions,
            ).map(range => ({
              range: {
                start: document.positionAt(block.startTagEnd + range.start),
                end: document.positionAt(block.startTagEnd + range.end),
              },
              severity: 2 as const,
              code: MpxDiagnosticCode.ReservedInstanceData,
              source: 'mpx',
              message: '"data" 是 Mpx 实例保留字段，请更换公开字段名。',
            }))
          })
        },
      }
    },
  }
}
