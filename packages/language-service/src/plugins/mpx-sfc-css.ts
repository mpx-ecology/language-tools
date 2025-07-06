import type * as CSS from 'vscode-css-languageservice'
import type { TextDocument } from 'vscode-languageserver-textdocument'
import type {
  LanguageServicePlugin,
  VirtualCode,
} from '@volar/language-service'
import { type Provide, create as baseCreate } from 'volar-service-css'
import { URI } from 'vscode-uri'
import { MpxVirtualCode } from '@mpxjs/language-core'

export function create(): LanguageServicePlugin {
  const base = baseCreate({
    scssDocumentSelector: ['scss', 'postcss'],
  })

  return {
    ...base,

    name: 'mpx-css',

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
