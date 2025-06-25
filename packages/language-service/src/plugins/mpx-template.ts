import * as html from 'vscode-html-languageservice'
import { create as createHtmlService } from 'volar-service-html'
import { LanguageServicePlugin } from '../types'
import templateBuiltInData from '../data/template'

export function create(): LanguageServicePlugin {
  const extraCustomData = html.newHTMLDataProvider(
    'mpx-template-built-in',
    templateBuiltInData,
  )

  const baseService = createHtmlService({
    getCustomData() {
      return [extraCustomData]
    },
  })

  return {
    name: `mpx-template`,
    capabilities: {
      ...baseService.capabilities,
      completionProvider: {
        triggerCharacters: [
          ...(baseService.capabilities.completionProvider?.triggerCharacters ??
            []),
        ],
      },
      hoverProvider: true,
    },
    create(context) {
      const baseServiceInstance = baseService.create(context)

      return {
        ...baseServiceInstance,
        dispose() {
          baseServiceInstance.dispose?.()
        },
        async provideCompletionItems(
          document,
          position,
          completionContext,
          token,
        ) {
          if (document.languageId !== 'html') {
            return
          }
          if (!context.project.mpx) {
            return
          }
          const htmlComplete =
            await baseServiceInstance.provideCompletionItems?.(
              document,
              position,
              completionContext,
              token,
            )
          if (!htmlComplete) {
            return
          }
          return htmlComplete
        },
        async provideHover(document, position, token) {
          if (document.languageId !== 'html') {
            return
          }
          const res = await baseServiceInstance.provideHover?.(
            document,
            position,
            token,
          )
          return res
        },
      }
    },
  }
}
