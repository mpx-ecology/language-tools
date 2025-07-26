import type * as vscode from 'vscode-languageserver-protocol'
import type { LanguageServicePlugin } from '@volar/language-service'
import { URI } from 'vscode-uri'
import { MpxVirtualCode } from '@mpxjs/language-core'

export function create(): LanguageServicePlugin {
  return {
    name: 'mpx-json-links',

    capabilities: {
      documentLinkProvider: {},
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

          const { result: usingComponents } =
            (await root.sfc.json.resolveUsingComponents) || {}
          if (!usingComponents?.size) {
            return result
          }

          for (const [_, componentsArray] of usingComponents) {
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

          return result
        },
      }
    },
  }
}
