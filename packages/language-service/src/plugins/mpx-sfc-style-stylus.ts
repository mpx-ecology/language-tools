import type * as vscode from 'vscode-languageserver-protocol'
import type { TextDocument } from 'vscode-languageserver-textdocument'
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

// Match Stylus property values containing hex colors
// Examples matched: "color #fff", "color: #fff", "background #aaa", "border-color:#333"
// Examples not matched: "#fff" at line start, selectors like "a #abc", "#bbb #ccc"
const stylusColorRegex =
  /^(\s*)([a-zA-Z][\w-]*)\s*:?\s+(.*?#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})(?![0-9a-fA-F]).*?)$/gm

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
        async provideDocumentFormattingEdits(document, range, options) {
          if (document.languageId !== 'stylus') {
            return
          }

          const stylusContent = document.getText(range)
          // Windows: 使用 \r\n 作为换行符
          const newLineChar = stylusContent.includes('\r\n') ? '\r\n' : '\n'
          // 获取初始缩进配置
          const initialIndent =
            (await context.env.getConfiguration?.(
              'mpx.format.style.initialIndent',
            )) ?? false

          let tabSpace = '  '
          if (options.insertSpaces) {
            // 当前文件使用空格符
            tabSpace = ' '.repeat(options.tabSize || 2)
          } else {
            // 当前文件使用制表符 \t
            tabSpace = '\t'
          }

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

        /**
         * support colorDecorators and colorPresentation
         */
        provideDocumentColors(document: TextDocument) {
          if (document.languageId !== 'stylus') {
            return
          }
          return parseStylusColors(document)
        },

        provideColorPresentations(document, color, range) {
          if (document.languageId !== 'stylus') {
            return
          }
          return parseStylusColorPresentation(range, color)
        },
      }
    },
  }
}

function parseStylusColors(document: TextDocument): CSS.ColorInformation[] {
  const colors: CSS.ColorInformation[] = []
  const text = document.getText()
  let match: RegExpExecArray | null
  while ((match = stylusColorRegex.exec(text))) {
    const fullMatch = match[0]
    const valueWithColor = match[3] // The part containing the hex color
    const hex = match[4] // The captured hex digits

    // Find the position of the # in the value part
    const colorIndex = valueWithColor.indexOf('#')
    if (colorIndex === -1) continue

    // Calculate the absolute position in the document
    const lineStartIndex = match.index
    const colorStartIndex =
      lineStartIndex + fullMatch.indexOf(valueWithColor) + colorIndex
    const colorEndIndex = colorStartIndex + 1 + hex.length // +1 for the #
    const start = document.positionAt(colorStartIndex)
    const end = document.positionAt(colorEndIndex)
    let [r, g, b] = [0, 0, 0]

    if (hex.length === 3) {
      r = parseInt(hex[0] + hex[0], 16)
      g = parseInt(hex[1] + hex[1], 16)
      b = parseInt(hex[2] + hex[2], 16)
    } else {
      r = parseInt(hex.slice(0, 2), 16)
      g = parseInt(hex.slice(2, 4), 16)
      b = parseInt(hex.slice(4, 6), 16)
    }
    colors.push({
      range: { start, end },
      color: {
        red: r / 255,
        green: g / 255,
        blue: b / 255,
        alpha: 1,
      },
    })
  }
  return colors
}

function parseStylusColorPresentation(
  range: CSS.Range,
  color: CSS.Color,
): CSS.ColorPresentation[] {
  const colors: CSS.ColorPresentation[] = []
  const r = Math.round(color.red * 255)
  const g = Math.round(color.green * 255)
  const b = Math.round(color.blue * 255)
  const hex = `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`
  colors.push({
    label: hex,
    textEdit: {
      range,
      newText: hex,
    },
  })
  return colors
}
