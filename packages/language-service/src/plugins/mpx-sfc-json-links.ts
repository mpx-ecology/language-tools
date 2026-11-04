import type * as vscode from 'vscode-languageserver-protocol'
import type { LanguageServicePlugin } from '@volar/language-service'
import { URI } from 'vscode-uri'
import { MpxVirtualCode } from '@mpxjs/language-core'
import {
  componentFileName,
  componentTargetsHover,
  jsonPathRange,
  jsonPathTargets,
} from '../utils/componentNavigation'
import { MpxDiagnosticCode } from '@mpxjs/language-shared'

export function create(): LanguageServicePlugin {
  return {
    name: 'mpx-json-links',

    capabilities: {
      documentLinkProvider: {},
      hoverProvider: true,
      diagnosticProvider: {
        interFileDependencies: false,
        workspaceDiagnostics: false,
      },
    },

    create(context) {
      function getRoot(rawUri: string) {
        const decoded = context.decodeEmbeddedDocumentUri(URI.parse(rawUri))
        if (!decoded || !/^json_(js|json)$/.test(decoded[1])) return
        const root = context.language.scripts.get(decoded[0])?.generated?.root
        return root instanceof MpxVirtualCode && root.sfc.json
          ? root
          : undefined
      }
      return {
        provideDocumentLinks(document) {
          const root = getRoot(document.uri)
          if (!root?.sfc.json) return
          // Overlapping DocumentLinks open just one target. Multi-target paths
          // use the definition provider so the editor can show its native Peek UI.
          return jsonPathTargets(document, root.sfc.json)
            .filter(group => group.files.length === 1)
            .map(group => ({
              range: group.range,
              target: URI.file(group.files[0]!).toString(),
              tooltip: `${group.title}：${componentFileName(group.files[0]!)}`,
            }))
        },

        provideHover(document, position) {
          const root = getRoot(document.uri)
          if (!root?.sfc.json) return
          const offset = document.offsetAt(position)
          for (const group of jsonPathTargets(document, root.sfc.json)) {
            if (
              group.files.length > 1 &&
              offset >= document.offsetAt(group.range.start) &&
              offset <= document.offsetAt(group.range.end)
            ) {
              return componentTargetsHover(
                group.range,
                group.files,
                group.title,
              )
            }
          }
        },

        async provideDiagnostics(document) {
          const root = getRoot(document.uri)
          if (!root?.sfc.json) return
          const diagnostics: vscode.Diagnostic[] = []
          const { errors: resolvedUsingComponentsErrors = [] } =
            (await root.sfc.json.resolvedUsingComponents) || {}
          const { errors: resolvedPagesErrors = [] } =
            (await root.sfc.json.resolvedPages) || {}

          for (const info of [
            ...resolvedUsingComponentsErrors,
            ...resolvedPagesErrors,
          ]) {
            diagnostics.push({
              range: jsonPathRange(document, info),
              severity: 1 satisfies typeof vscode.DiagnosticSeverity.Error,
              code: MpxDiagnosticCode.JsonPathNotFound,
              source: 'mpx-json',
              message: `找不到对应路径文件：'${info.text}'，请检查文件路径是否正确。`,
            })
          }
          return diagnostics
        },
      }
    },
  }
}
