import type { LanguageServicePlugin } from '@volar/language-service'
import { URI } from 'vscode-uri'
import * as vscode from 'vscode-languageserver-protocol'
import type * as ts from 'typescript'

export function create(getTsClient: any): LanguageServicePlugin {
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

          if (!embeddedCodeId.startsWith('json_')) {
            return
          }
          const sourceScript = context.language.scripts.get(documentUri)
          const virtualCode =
            sourceScript?.generated?.embeddedCodes.get(embeddedCodeId)
          const jsonStart = virtualCode?.mappings[0].sourceOffsets[0] || 0
          // 获取当前光标位置的偏移量
          const offset = document.offsetAt(position)
          const absoluteOffset = offset + jsonStart
          const tsClient = getTsClient()
          // 在映射到的虚拟 import 位置获取补全
          const tsCompletions = await tsClient.getCompletion(
            documentUri.fsPath,
            absoluteOffset,
          )

          /**
           * todo: 出现重复。具体原因待排查.
           * 但是打印completions 为没有重复的
           */
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
            items: new Set(completions) as unknown as vscode.CompletionItem[],
          }
        },
      }
    },
  }
}
