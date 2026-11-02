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
        // CSS remains the primary provider for the same embedded document.
        isAdditionalCompletion: true,

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

          const text = document.getText()
          const offset = document.offsetAt(position)
          const prefix = text.slice(0, offset).match(/@[a-z-]*$/)?.[0]
          if (!prefix) {
            return
          }

          const start = offset - prefix.length
          const end =
            offset + (text.slice(offset).match(/^[a-z-]*/)?.[0].length ?? 0)
          const lineStart = document.offsetAt({
            line: position.line,
            character: 0,
          })
          const hasLineComments = ['scss', 'less', 'sass', 'stylus'].includes(
            document.languageId,
          )
          const tokens = new RegExp(
            String.raw`/\*[\s\S]*?(?:\*/|$)|"(?:\\[\s\S]|[^"\\])*(?:"|$)|'(?:\\[\s\S]|[^'\\])*(?:'|$)|\\[\s\S]` +
              (hasLineComments ? String.raw`|//[^\r\n]*` : ''),
            'g',
          )
          let comment: RegExpExecArray | undefined
          for (
            let token;
            (token = tokens.exec(text)) && token.index <= start;

          ) {
            if (start < token.index + token[0].length) {
              if (!token[0].startsWith('/*') && !token[0].startsWith('//')) {
                return
              }
              comment = token
              break
            }
          }

          // Keep this provider scoped to standalone directive comments. In
          // particular, comment-looking text inside preprocessor interpolation
          // strings must not turn into a stylesheet edit.
          const commentLineStart = comment
            ? text.lastIndexOf('\n', comment.index - 1) + 1
            : lineStart
          if (
            comment
              ? !/^\s*$/.test(text.slice(commentLineStart, comment.index)) ||
                !/^\s*$/.test(text.slice(comment.index + 2, start))
              : !/^\s*$/.test(text.slice(lineStart, start)) ||
                !/^\s*$/.test(text.slice(end).split(/\r?\n/, 1)[0])
          ) {
            return
          }

          const hasCondition = comment
            ? /^\s*\(/.test(text.slice(end, comment.index + comment[0].length))
            : false
          const closeComment =
            !comment ||
            (comment[0].startsWith('/*') &&
              !comment[0].endsWith('*/') &&
              !hasCondition)
          const items: CompletionItem[] = cmds
            .filter(label => `@${label}`.startsWith(prefix))
            .map(label => {
              const condition =
                (label === 'mpx-if' || label === 'mpx-elif') && !hasCondition
                  ? ' ($1)'
                  : ''
              return {
                label: `@${label}`,
                labelDetails: {
                  description: label,
                  detail: `/* @${label}${condition} */`,
                },
                kind: 15 satisfies typeof vscode.CompletionItemKind.Snippet,
                insertTextFormat:
                  2 satisfies typeof vscode.InsertTextFormat.Snippet,
                textEdit: {
                  range: {
                    start: document.positionAt(start),
                    end: document.positionAt(end),
                  },
                  newText: `${comment ? '' : '/* '}@${label}${condition}${closeComment ? ' */' : ''}`,
                },
              }
            })
          if (!items.length) {
            return
          }

          return {
            isIncomplete: true,
            items,
          }
        },
      }
    },
  }
}
