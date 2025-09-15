import type * as CSS from 'vscode-css-languageservice'
import type { TextDocument } from 'vscode-languageserver-textdocument'
import {
  type Color,
  type LanguageServicePlugin,
  TextEdit,
  type VirtualCode,
} from '@volar/language-service'
import { type Provide, create as baseCreate } from 'volar-service-css'
import { URI } from 'vscode-uri'
import { MpxVirtualCode } from '@mpxjs/language-core'

function parseStylusColors(document: TextDocument): CSS.ColorInformation[] {
  const colors: CSS.ColorInformation[] = []
  const text = document.getText()

  const regex = /#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})\b/g
  let match: RegExpExecArray | null
  while ((match = regex.exec(text))) {
    const start = document.positionAt(match.index)
    const end = document.positionAt(match.index + match[0].length)
    const hex = match[1]
    let r = 0,
      g = 0,
      b = 0
    if (hex.length === 3) {
      r = parseInt(hex[0] + hex[0], 16)
      g = parseInt(hex[1] + hex[1], 16)
      b = parseInt(hex[2] + hex[2], 16)
    } else {
      r = parseInt(hex.slice(0, 2), 16)
      g = parseInt(hex.slice(2, 4), 16)
      b = parseInt(hex.slice(4, 6), 16)
    }
    const color: Color = {
      red: r / 255,
      green: g / 255,
      blue: b / 255,
      alpha: 1,
    }
    colors.push({ range: { start, end }, color })
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
    textEdit: TextEdit.replace(range, hex),
  })
  return colors
}

export function create(): LanguageServicePlugin {
  const base = baseCreate({
    scssDocumentSelector: ['scss', 'postcss'],
  })

  return {
    ...base,

    name: 'mpx-style-css',

    create(context) {
      const baseInstance = base.create(context)
      const {
        'css/languageService': getCssLs,
        'css/stylesheet': getStylesheet,
      } = baseInstance.provide as Provide

      return {
        ...baseInstance,

        async provideDiagnostics(document, token) {
          let diagnostics =
            (await baseInstance.provideDiagnostics?.(document, token)) ?? []
          if (document.languageId === 'postcss') {
            diagnostics = diagnostics.filter(
              diag => diag.code !== 'css-semicolonexpected',
            )
            diagnostics = diagnostics.filter(
              diag => diag.code !== 'css-ruleorselectorexpected',
            )
            diagnostics = diagnostics.filter(
              diag => diag.code !== 'unknownAtRules',
            )
          }
          return diagnostics
        },

        /**
         * If the editing position is within the virtual code and navigation is enabled,
         * skip the CSS renaming feature.
         */
        provideRenameRange(document, position) {
          do {
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
              break
            }

            const root = sourceScript.generated.root
            if (!(root instanceof MpxVirtualCode)) {
              break
            }

            const block = root.sfc.styles.find(
              style => style.name === decoded![1],
            )
            if (!block) {
              break
            }

            let script: VirtualCode | undefined
            for (const [key, value] of sourceScript.generated.embeddedCodes) {
              if (key.startsWith('script_')) {
                script = value
                break
              }
            }
            if (!script) {
              break
            }

            const offset = document.offsetAt(position) + block.startTagEnd
            for (const { sourceOffsets, lengths, data } of script.mappings) {
              if (
                !sourceOffsets.length ||
                !data.navigation ||
                (typeof data.navigation === 'object' &&
                  !data.navigation.shouldRename)
              ) {
                continue
              }

              const start = sourceOffsets[0]
              const end = sourceOffsets.at(-1)! + lengths.at(-1)!

              if (offset >= start && offset <= end) {
                return
              }
            }
            // eslint-disable-next-line no-constant-condition
          } while (0)

          return worker(document, (stylesheet, cssLs) => {
            return cssLs.prepareRename(document, position, stylesheet)
          })
        },

        /**
         * support colorDecorators and colorPresentation
         */
        provideDocumentColors(document: TextDocument) {
          if (document.languageId === 'stylus') {
            return parseStylusColors(document)
          }
          return worker(document, (stylesheet, cssLs) => {
            return cssLs.findDocumentColors(document, stylesheet)
          })
        },
        provideColorPresentations(document, color, range) {
          if (document.languageId === 'stylus') {
            return parseStylusColorPresentation(range, color)
          }
          return worker(document, (stylesheet, cssLs) => {
            return cssLs.getColorPresentations(
              document,
              stylesheet,
              color,
              range,
            )
          })
        },
      }

      function worker<T>(
        document: TextDocument,
        callback: (stylesheet: CSS.Stylesheet, cssLs: CSS.LanguageService) => T,
      ) {
        const cssLs = getCssLs(document)
        if (!cssLs) {
          return
        }
        return callback(getStylesheet(document, cssLs), cssLs)
      }
    },
  }
}
