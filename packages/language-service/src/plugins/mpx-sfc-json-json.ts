import type * as vscode from 'vscode-languageserver-protocol'
import type { LanguageServicePlugin } from '@volar/language-service'
import { create as baseCreate } from 'volar-service-json'
import mpxJsonSchema from '../data/mpxJsonSchema'
import { URI } from 'vscode-uri'
import { MpxVirtualCode } from '@mpxjs/language-core'

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

    getLanguageSettings: () => {
      return {
        validate: true,
        schemas: [
          {
            uri: 'mpx-json.schema.json',
            fileMatch: ['*.mpx'],
            schema: mpxJsonSchema,
          },
        ],
      }
    },
  })

  return {
    name: 'mpx-json-json',

    capabilities: base.capabilities,

    create(context) {
      if (!context.project.mpx) {
        return {}
      }

      const baseInstance = base.create(context)

      return {
        ...baseInstance,

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

          const jsonErrors: vscode.Diagnostic[] = []

          const { errors } = (await root.sfc.json.resolveUsingComponents) || {}
          if (!errors?.length) {
            return jsonErrors
          }

          for (const { text, offset } of errors) {
            jsonErrors.push({
              range: {
                start: document.positionAt(offset),
                end: document.positionAt(offset + text.length),
              },
              severity: 1 satisfies typeof vscode.DiagnosticSeverity.Error,
              // code: '1001',
              source: 'mpx-json',
              message: `找不到对应路径文件：'${text}'，请检查文件路径是否正确。`,
            })
          }

          return jsonErrors
        },
      }
    },
  }
}
