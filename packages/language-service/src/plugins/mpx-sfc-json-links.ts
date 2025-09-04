import type * as vscode from 'vscode-languageserver-protocol'
import type { LanguageServicePlugin } from '@volar/language-service'
import { URI } from 'vscode-uri'
import { MpxVirtualCode } from '@mpxjs/language-core'

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
              for (const {
                text: componentPath,
                offset: componentPathOffset,
                realFilename: targetFilePath,
              } of componentsArray) {
                if (!targetFilePath) {
                  continue
                }
                result.push({
                  range: {
                    start: document.positionAt(componentPathOffset),
                    end: document.positionAt(
                      componentPathOffset + componentPath.length,
                    ),
                  },
                  // fix: 兼容 Windows 路径协议 eg: file:///d:/{you_path}/list.mpx
                  target: URI.file(targetFilePath).toString(),
                  tooltip: `自定义组件：${componentPath}`,
                })
              }
            }
          }

          if (resolvedPages?.length) {
            for (const page of resolvedPages) {
              const {
                text: pagePath,
                offset: pagePathOffset,
                realFilename: targetFilePath,
              } = page
              if (!targetFilePath) {
                continue
              }
              result.push({
                range: {
                  start: document.positionAt(pagePathOffset),
                  end: document.positionAt(pagePathOffset + pagePath.length),
                },
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
          for (const { text, offset } of [
            ...resolvedUsingComponentsErrors,
            ...resolvedPagesErrors,
          ]) {
            diagnostics.push({
              range: {
                start: document.positionAt(offset),
                end: document.positionAt(offset + text.length),
              },
              severity: 1 satisfies typeof vscode.DiagnosticSeverity.Error,
              code: '4001',
              source: 'mpx-json',
              message: `找不到对应路径文件：'${text}'，请检查文件路径是否正确。`,
            })
          }

          return diagnostics
        },
      }
    },
  }
}
