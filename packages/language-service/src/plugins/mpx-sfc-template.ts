import * as html from 'vscode-html-languageservice'
import { create as createHtmlService } from 'volar-service-html'
import { LanguageServicePlugin } from '../types'
import templateBuiltInData from '../data/template'
import { templateCodegenHelper } from '../utils/templateCodegenHelper'

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
          const helper = templateCodegenHelper(context, document.uri)
          const usingComponents = helper?.sfc.json?.usingComponents
          if (usingComponents?.size) {
            htmlComplete.items = htmlComplete.items.filter(
              item => !usingComponents.has(item.label),
            )
            for (const [
              componentTag,
              { text: componentPath },
            ] of usingComponents) {
              htmlComplete.items.push({
                label: componentTag,
                labelDetails: {
                  description: '自定义组件',
                },
                detail: componentPath,
                // documentation: {
                //   kind: 'markdown',
                //   value: `自定义组件：\`${componentPath}\``,
                // },
                insertTextFormat: 1,
                kind: 10,
                textEdit: {
                  range: {
                    start: position,
                    end: position,
                  },
                  newText: componentTag,
                },
              })
            }
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
          if (res?.range?.start) {
            const offset = document.offsetAt(res.range.start)
            const helper = templateCodegenHelper(context, document.uri)
            if (helper) {
              const { codegen, sfc } = helper
              const templateNodeTags =
                codegen?.getGeneratedTemplate()?.templateNodeTags ?? []
              const usingComponents = sfc.json?.usingComponents
              if (usingComponents?.size) {
                for (const nodeTag of templateNodeTags) {
                  const { name: componentTag, startTagOffset } = nodeTag
                  if (
                    usingComponents.has(componentTag) &&
                    startTagOffset === offset
                  ) {
                    return undefined
                    // 自定义组件已经有了 document link 提供 hover 描述信息
                    // res.contents = `自定义组件：${usingComponents.get(componentTag)?.text}`
                  }
                }
              }
            }
          }
          return res
        },
      }
    },
  }
}
