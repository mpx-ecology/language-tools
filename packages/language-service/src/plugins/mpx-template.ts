import * as html from 'vscode-html-languageservice'
import { create as createHtmlService } from 'volar-service-html'
import { LanguageServicePlugin } from '../types'
import templateBuiltInData from '../data/template'

export function create(): LanguageServicePlugin {
  const mpxBuiltInData = html.newHTMLDataProvider(
    'mpx-template-built-in',
    templateBuiltInData,
  )
  const mpxBuiltInTagsSet = new Set(
    templateBuiltInData?.tags?.map(tag => tag.name),
  )
  const htmlBuilInData = html.getDefaultHTMLDataProvider()
  /**
   * 去除 HTML 内置标签中与 Mpx 同名的标签，
   * 比如 <input>、<button>、<form> ..
   * 避免补全出现重复标签以及 hover 优先级问题
   */
  // @ts-ignore
  htmlBuilInData._tags = htmlBuilInData._tags.filter(
    (htmlTag: html.ITagData) => !mpxBuiltInTagsSet.has(htmlTag.name),
  )

  const baseService = createHtmlService({
    documentSelector: ['html'],
    useDefaultDataProvider: false,
    getCustomData() {
      return [mpxBuiltInData, htmlBuilInData]
    },
  })

  return {
    name: 'mpx-template',
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
