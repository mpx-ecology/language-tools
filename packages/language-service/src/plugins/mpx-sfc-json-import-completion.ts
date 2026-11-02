import type * as ts from 'typescript'
import type {
  LanguageServiceContext,
  LanguageServicePlugin,
} from '@volar/language-service'
import type { IRequests } from '@mpxjs/typescript-plugin/src/requests'
import { URI } from 'vscode-uri'
import * as vscode from 'vscode-languageserver-protocol'

export function create(
  getTsClient: (context: LanguageServiceContext) => IRequests | undefined,
): LanguageServicePlugin {
  return {
    name: 'mpx-json-import-completion',

    capabilities: {
      completionProvider: {
        triggerCharacters: ['/'],
      },
    },

    create(context) {
      return {
        async provideCompletionItems(document, position) {
          // 检查是否是 mpx 文件中的 JSON 部分
          const uri = URI.parse(document.uri)
          const decoded = context.decodeEmbeddedDocumentUri(uri)

          if (!decoded) return

          const [documentUri, embeddedCodeId] = decoded

          if (!/^json_(js|json)$/.test(embeddedCodeId)) {
            return
          }
          const sourceScript = context.language.scripts.get(documentUri)
          const virtualCode =
            sourceScript?.generated?.embeddedCodes.get(embeddedCodeId)
          const jsonStart = virtualCode?.mappings[0].sourceOffsets[0] || 0
          // 获取当前光标位置的偏移量
          const offset = document.offsetAt(position)
          const absoluteOffset = offset + jsonStart
          const tsClient = getTsClient(context)
          // 在映射到的虚拟 import 位置获取补全
          const tsCompletions = await tsClient?.getCompletion(
            documentUri.fsPath,
            absoluteOffset,
          )

          if (!tsCompletions?.length) return

          const completions = tsCompletions.map((item: ts.CompletionEntry) => {
            return {
              label: item.name,
              kind:
                item.kind === 'directory'
                  ? vscode.CompletionItemKind.Folder
                  : vscode.CompletionItemKind.File,
            }
          })

          return {
            isIncomplete: true,
            items: [
              ...new Map(completions.map(item => [item.label, item])).values(),
            ],
          }
        },
      }
    },
  }
}
