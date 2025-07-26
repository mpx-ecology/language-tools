import type * as vscode from 'vscode-languageserver-protocol'
import type { LanguageServicePlugin } from '@volar/language-service'
import * as stylusSupremacy from 'stylus-supremacy'
import * as CSS from 'vscode-css-languageservice'
import {
  builtinStylusFunction,
  getAllSymbols,
  getAtRules,
  getProperties,
  getValues,
  isValue,
} from '../utils/stylus'

export function create(): LanguageServicePlugin {
  const cssBuiltinData = CSS.getDefaultCSSDataProvider()
  const cssData: CSS.CSSDataV1 = {
    version: 1.1,
    properties: cssBuiltinData.provideProperties() || [],
    atDirectives: cssBuiltinData.provideAtDirectives() || [],
    pseudoClasses: cssBuiltinData.providePseudoClasses() || [],
    pseudoElements: cssBuiltinData.providePseudoElements() || [],
  }

  return {
    name: 'mpx-style-stylus',

    capabilities: {
      documentFormattingProvider: true,
    },

    create(context) {
      if (!context.project.mpx) {
        return {}
      }

      return {
        async provideDocumentFormattingEdits(document, range) {
          if (document.languageId !== 'stylus') {
            return
          }

          const stylusContent = document.getText(range)
          // Windows: 使用 \r\n 作为换行符
          const newLineChar = stylusContent.includes('\r\n') ? '\r\n' : '\n'
          const tabSpace = '  ' // 使用两个空格代替制表符 \t
          // 获取初始缩进配置
          const initialIndent =
            (await context.env.getConfiguration?.(
              'mpx.format.style.initialIndent',
            )) ?? false

          /**
           * @see: https://thisismanta.github.io/stylus-supremacy/#options
           */
          const formattingOptions: stylusSupremacy.FormattingOptions = {
            insertColons: false, // 默认不插入冒号
            insertSemicolons: false, // 默认不插入分号
            insertBraces: false, // 默认不插入大括号
            insertSpaceBeforeComment: true, // 默认在注释前插入空格
            insertSpaceAfterComment: true, // 默认在注释后插入空格
            tabStopChar: tabSpace, // 默认的 '\t' 可能会因为缩进不一致导致格式化错误
            newLineChar: '\n',
            ...((await context.env.getConfiguration?.(
              'mpx.format.style.stylus',
            )) ?? {}),
          }

          try {
            let newText = stylusSupremacy.format(
              stylusContent,
              formattingOptions,
            )
            if (initialIndent) {
              newText = newText
                .split(/\n/)
                .map(line => (line.length > 0 ? tabSpace + line : ''))
                .join(newLineChar)
            }
            return [{ newText, range }]
          } catch (error) {
            console.error(
              `[Mpx] Stylus Supremacy Formatting Error: ${error instanceof Error ? error.message : String(error)}`,
            )
            return
          }
        },

        async provideCompletionItems(document, position, _context, _token) {
          if (document.languageId !== 'stylus') {
            return
          }

          const start = document.offsetAt({ line: position.line, character: 0 })
          const end = document.offsetAt(position)
          const text = document.getText()
          const currentWord = text.slice(start, end).trim()
          const value = isValue(cssData, currentWord)

          let completeItems: vscode.CompletionItem[] = []

          try {
            if (value) {
              const values = getValues(cssData, currentWord)
              const symbols = getAllSymbols(text).filter(
                item =>
                  item.kind ===
                    (6 satisfies typeof vscode.CompletionItemKind.Variable) ||
                  item.kind ===
                    (3 satisfies typeof vscode.CompletionItemKind.Function),
              )
              completeItems = completeItems.concat(
                values,
                symbols,
                builtinStylusFunction,
              )
            } else {
              const atRules = getAtRules(cssData, currentWord)
              const properties = getProperties(cssData, currentWord, false)
              const symbols = getAllSymbols(text).filter(
                item =>
                  item.kind !==
                  (6 satisfies typeof vscode.CompletionItemKind.Variable),
              )
              completeItems = completeItems.concat(properties, atRules, symbols)
            }

            return {
              isIncomplete: false,
              items: completeItems,
            } satisfies vscode.CompletionList
          } catch (error) {
            console.error(
              `[Mpx] Stylus Completion Error: ${error instanceof Error ? error.message : String(error)}`,
            )
            return
          }
        },
      }
    },
  }
}
