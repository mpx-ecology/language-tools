import type {
  CompletionItem,
  LanguageServicePlugin,
} from '@volar/language-service'
import type * as vscode from 'vscode-languageserver-protocol'
import { URI } from 'vscode-uri'

const cmds = ['mpx-if', 'mpx-elif', 'mpx-else', 'mpx-endif']

/**
 * Mpx style directive comments 样式注释指令补全
 * e.g. `/* @mpx-if (|) *\/` `/* @mpx-endif *\/` 触发补全
 */
export function create(): LanguageServicePlugin {
  return {
    name: 'mpx-style-directive-comments',

    capabilities: {
      completionProvider: {
        triggerCharacters: ['@'],
      },
    },

    create(context) {
      return {
        provideCompletionItems(document, position) {
          const uri = URI.parse(document.uri)
          const decoded = context.decodeEmbeddedDocumentUri(uri)
          const sourceScript =
            decoded && context.language.scripts.get(decoded[0])
          const virtualCode =
            decoded && sourceScript?.generated?.embeddedCodes.get(decoded[1])
          if (
            !sourceScript?.generated ||
            !virtualCode?.id.startsWith('style_')
          ) {
            return
          }

          const line = document.getText({
            start: { line: position.line, character: 0 },
            end: position,
          })
          if (!/^\s*@$/.test(line)) {
            return
          }

          const items: CompletionItem[] = cmds.map(label => ({
            label: `@${label}`,
            labelDetails: {
              description: label,
              detail:
                label === 'mpx-if' ? '/* @mpx-if ($1) */' : `/* @${label} */`,
            },
            kind: 15 satisfies typeof vscode.CompletionItemKind.Snippet,
            insertTextFormat:
              2 satisfies typeof vscode.InsertTextFormat.Snippet,
            textEdit: {
              range: {
                start: {
                  line: position.line,
                  character: line.lastIndexOf('@'),
                },
                end: position,
              },
              newText:
                label === 'mpx-if' ? '/* @mpx-if ($1) */' : `/* @${label} */`,
            },
          }))

          return {
            isIncomplete: false,
            items,
          }
        },
      }
    },
  }
}
