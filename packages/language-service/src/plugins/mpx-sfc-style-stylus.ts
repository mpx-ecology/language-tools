import type { LanguageServicePlugin } from '@volar/language-service'
import * as stylusSupremacy from 'stylus-supremacy'

export function create(): LanguageServicePlugin {
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

          // see: https://thisismanta.github.io/stylus-supremacy/#options
          const formattingOptions: stylusSupremacy.FormattingOptions = {
            insertColons: false, // 默认不插入冒号
            insertSemicolons: false, // 默认不插入分号
            insertBraces: false, // 默认不插入大括号
            insertSpaceBeforeComment: true, // 默认在注释前插入空格
            insertSpaceAfterComment: true, // 默认在注释后插入空格
            ...((await context.env.getConfiguration?.(
              'mpx.format.style.stylus',
            )) ?? {}),
          }

          try {
            const res = stylusSupremacy.format(stylusContent, formattingOptions)
            return [
              {
                newText: res,
                range,
              },
            ]
          } catch (error) {
            console.error(
              `[Mpx] Stylus Supremacy Formatting Error: ${error instanceof Error ? error.message : String(error)}`,
            )
            return
          }
        },
      }
    },
  }
}
