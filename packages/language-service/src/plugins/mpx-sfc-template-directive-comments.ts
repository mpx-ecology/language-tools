import type {
  CompletionItem,
  LanguageServicePlugin,
} from '@volar/language-service'
import type * as vscode from 'vscode-languageserver-protocol'

const cmds = ['mpx-ignore', 'mpx-skip', 'mpx-expect-error']

const directiveCommentReg = /<!--\s*@/

/**
 * Mpx directive comments 注释指令补全
 * e.g. `<!-- @` 触发补全
 */
export function create(): LanguageServicePlugin {
  return {
    name: 'mpx-template-directive-comments',

    capabilities: {
      completionProvider: {
        triggerCharacters: ['@'],
      },
    },

    create() {
      return {
        provideCompletionItems(document, position) {
          if (document.languageId !== 'html') {
            return
          }

          const line = document.getText({
            start: { line: position.line, character: 0 },
            end: position,
          })
          const cmdStart = line.match(directiveCommentReg)
          if (!cmdStart) {
            return
          }

          const startIndex = cmdStart.index! + cmdStart[0].length
          const remainText = line.slice(startIndex)
          const result: CompletionItem[] = []

          for (const label of cmds) {
            let match = true
            for (let i = 0; i < remainText.length; i++) {
              if (remainText[i] !== label[i]) {
                match = false
                break
              }
            }
            if (match) {
              result.push({
                label: `@${label}`,
                textEdit: {
                  range: {
                    start: {
                      line: position.line,
                      character: startIndex - 1,
                    },
                    end: position,
                  },
                  newText: `@${label}`,
                },
                insertTextFormat:
                  2 satisfies typeof vscode.InsertTextFormat.Snippet,
              })
            }
          }

          return {
            isIncomplete: false,
            items: result,
          }
        },
      }
    },
  }
}
