import type * as vscode from 'vscode-languageserver-protocol'
import type { LanguageServicePlugin } from '@volar/language-service'
import { create as baseCreate } from 'volar-service-json'
import { URI } from 'vscode-uri'
import { MpxVirtualCode } from '@mpxjs/language-core'
import { formatUsingComponentsPath } from '../utils/formatUsingComponentsPath'

export function create(): LanguageServicePlugin {
  const base = baseCreate({
    getDocumentLanguageSettings: () => {
      // mpx script-json json 语法模块允许注释和尾随逗号
      return { comments: 'ignore', trailingCommas: 'ignore' }
    },

    getFormattingOptions: async (_document, options, context) => {
      return {
        ...options,
        ...(await context.env.getConfiguration?.('json.format')),
        // 最后一行换行避免和 </script> 标签同一行
        insertFinalNewline: true,
      }
    },
  })

  return {
    name: 'mpx-json-json',

    capabilities: {
      ...base.capabilities,
      documentLinkProvider: {},
    },

    create(context) {
      if (!context.project.mpx) {
        return {}
      }

      const baseInstance = base.create(context)

      return {
        ...baseInstance,

        provideDocumentLinks(document) {
          const uri = URI.parse(document.uri)
          const decoded = context.decodeEmbeddedDocumentUri(uri)
          if (!decoded) {
            return
          }
          const [documentUri, embeddedCodeId] = decoded
          if (embeddedCodeId !== 'json_json') {
            return
          }
          const sourceScript = context.language.scripts.get(documentUri)
          const virtualCode =
            sourceScript?.generated?.embeddedCodes.get(embeddedCodeId)
          if (!sourceScript?.generated || virtualCode?.id !== 'json_json') {
            return
          }

          const root = sourceScript.generated.root
          if (!(root instanceof MpxVirtualCode) || !root.sfc.json) {
            return
          }

          const result: vscode.DocumentLink[] = []

          const usingComponents = root.sfc.json.usingComponents

          if (!usingComponents?.size) {
            return result
          }

          for (const [
            _,
            { text: componentPath, offset: componentPathOffset },
          ] of usingComponents) {
            const targetFilePath = formatUsingComponentsPath(
              componentPath,
              root.fileName,
            )
            result.push({
              range: {
                start: document.positionAt(componentPathOffset),
                end: document.positionAt(
                  componentPathOffset + componentPath.length,
                ),
              },
              target: targetFilePath,
              tooltip: `自定义组件：${componentPath}`,
            })
          }

          return result
        },
      }
    },
  }
}
