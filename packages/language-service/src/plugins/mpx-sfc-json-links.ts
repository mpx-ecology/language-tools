import type * as vscode from 'vscode-languageserver-protocol'
import type { LanguageServicePlugin } from '@volar/language-service'
import { URI } from 'vscode-uri'
import { MpxVirtualCode, type UsingComponentInfo } from '@mpxjs/language-core'
import { MpxDiagnosticCode } from '@mpxjs/language-shared'
import { isMpPluginComponentPath } from '../utils'

export function create(): LanguageServicePlugin {
  return {
    name: 'mpx-json-links',

    capabilities: {
      documentLinkProvider: {},
      diagnosticProvider: {
        interFileDependencies: false,
        workspaceDiagnostics: false,
      },
    },

    create(context) {
      return {
        async provideDocumentLinks(document) {
          const uri = URI.parse(document.uri)
          const decoded = context.decodeEmbeddedDocumentUri(uri)
          if (!decoded) {
            return
          }
          const [documentUri, embeddedCodeId] = decoded
          if (!/json_(js|json)/.test(embeddedCodeId)) {
            return
          }
          const sourceScript = context.language.scripts.get(documentUri)
          const root = sourceScript?.generated?.root
          if (!(root instanceof MpxVirtualCode) || !root.sfc.json) {
            return
          }

          const result: vscode.DocumentLink[] = []
          const { result: resolvedUsingComponents } =
            (await root.sfc.json.resolvedUsingComponents) || {}
          const { result: resolvedPages } =
            (await root.sfc.json.resolvedPages) || {}

          if (resolvedUsingComponents?.size) {
            for (const [_, componentsArray] of resolvedUsingComponents) {
              for (const info of componentsArray) {
                const { text: componentPath, realFilename: targetFilePath } =
                  info
                if (!targetFilePath) {
                  continue
                }
                if (isMpPluginComponentPath(componentPath)) {
                  // Fix #70 plugin 组件路径不处理
                  continue
                }
                result.push({
                  range: pathRange(document, info),
                  // fix: 兼容 Windows 路径协议 eg: file:///d:/{you_path}/list.mpx
                  target: URI.file(targetFilePath).toString(),
                  tooltip: `自定义组件：${componentPath}`,
                })
              }
            }
          }

          if (resolvedPages?.length) {
            for (const page of resolvedPages) {
              const { text: pagePath, realFilename: targetFilePath } = page
              if (!targetFilePath) {
                continue
              }
              result.push({
                range: pathRange(document, page),
                target: URI.file(targetFilePath).toString(),
                tooltip: `页面路径：${pagePath}`,
              })
            }
          }

          return result
        },

        async provideDiagnostics(document) {
          const uri = URI.parse(document.uri)
          const decoded = context.decodeEmbeddedDocumentUri(uri)
          if (!decoded) {
            return
          }
          const [documentUri, embeddedCodeId] = decoded
          if (!/json_(js|json)/.test(embeddedCodeId)) {
            return
          }
          const sourceScript = context.language.scripts.get(documentUri)
          const root = sourceScript?.generated?.root
          if (!(root instanceof MpxVirtualCode) || !root.sfc.json) {
            return
          }

          const diagnostics: vscode.Diagnostic[] = []

          const { errors: resolvedUsingComponentsErrors = [] } =
            (await root.sfc.json.resolvedUsingComponents) || {}
          const { errors: resolvedPagesErrors = [] } =
            (await root.sfc.json.resolvedPages) || {}

          if (
            !resolvedUsingComponentsErrors?.length &&
            !resolvedPagesErrors?.length
          ) {
            return []
          }

          // 收集路径错误
          for (const info of [
            ...resolvedUsingComponentsErrors,
            ...resolvedPagesErrors,
          ]) {
            diagnostics.push({
              range: pathRange(document, info),
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

function pathRange(
  document: import('vscode-languageserver-textdocument').TextDocument,
  info: UsingComponentInfo,
) {
  const [start, end] = info.sourceRange ?? [
    info.offset + 1,
    info.offset + 1 + info.text.length,
  ]
  return { start: document.positionAt(start), end: document.positionAt(end) }
}
