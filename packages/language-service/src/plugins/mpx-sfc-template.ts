import type { Disposable } from '@volar/language-service'
import * as html from 'vscode-html-languageservice'
import { create as createHtmlService } from 'volar-service-html'
import { LanguageServicePlugin, SfcJsonBlockUsingComponents } from '../types'
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

  let htmlBuilInData = [html.getDefaultHTMLDataProvider()]
  let extraCustomData: html.IHTMLDataProvider[] = []

  const onDidChangeCustomDataListeners = new Set<() => void>()
  const onDidChangeCustomData = (listener: () => void): Disposable => {
    onDidChangeCustomDataListeners.add(listener)
    return {
      dispose() {
        onDidChangeCustomDataListeners.delete(listener)
      },
    }
  }

  const baseService = createHtmlService({
    documentSelector: ['html'],
    useDefaultDataProvider: false,
    getCustomData() {
      return [...extraCustomData, mpxBuiltInData, ...htmlBuilInData]
    },
    onDidChangeCustomData,
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

      const runUpdateExtraCustomData = (
        usingComponents?: SfcJsonBlockUsingComponents,
      ) => {
        updateExtraCustomData({
          getId: () => 'mpx-template-custom-json',
          isApplicable: () => true,
          provideTags: () => {
            const tags: html.ITagData[] = []
            if (usingComponents?.size) {
              for (const [componentTag, componentPaths] of usingComponents) {
                if (!componentTag) {
                  continue
                }
                tags.push({
                  name: componentTag,
                  description: {
                    kind: 'markdown',
                    value: `自定义组件：\n- ${componentPaths.map(p => p.text).join('\n- ')}`,
                  },
                  attributes: [],
                })
              }
            }
            return tags
          },
          provideAttributes: () => [],
          provideValues: () => [],
        })
      }

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
          const helper = templateCodegenHelper(context, document.uri)
          const usingComponents = helper?.sfc.json?.usingComponents
          runUpdateExtraCustomData(usingComponents)
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
          htmlComplete.items.forEach(item => {
            if (usingComponents?.has(item.label)) {
              const componentPaths = usingComponents.get(item.label)
              if (componentPaths?.length) {
                item.labelDetails = {
                  description: `自定义组件`,
                }
              }
            }
          })
          return htmlComplete
        },

        async provideHover(document, position, token) {
          if (document.languageId !== 'html') {
            return
          }
          const helper = templateCodegenHelper(context, document.uri)
          const usingComponents = helper?.sfc.json?.usingComponents
          runUpdateExtraCustomData(usingComponents)
          const res = await baseServiceInstance.provideHover?.(
            document,
            position,
            token,
          )
          // @ts-ignore
          if (res?.contents?.value?.startsWith('自定义组件')) {
            return
          }
          return res
        },
      }
    },
  }

  function updateExtraCustomData(extraData: html.IHTMLDataProvider) {
    /**
     * 去除 HTML 内置标签中与 Mpx 内置标签以及自定义组件同名的标签，
     * 比如 <input>、<button>、<form> ..
     * 避免补全出现重复标签以及 hover 优先级问题
     */
    const htmlBuilInData2 = html.getDefaultHTMLDataProvider()
    // @ts-ignore
    htmlBuilInData2._tags = htmlBuilInData2._tags.filter(
      (htmlTag: html.ITagData) =>
        !mpxBuiltInTagsSet.has(htmlTag.name) &&
        !extraData.provideTags().some(tag => tag.name === htmlTag.name),
    )
    // @ts-ignore
    // 避免 html button type 补全时出现 bt 的 valueSet 冲突
    delete htmlBuilInData2._valueSetMap?.['bt']
    extraCustomData = [extraData]
    htmlBuilInData = [htmlBuilInData2]
    onDidChangeCustomDataListeners.forEach(l => l())
  }
}
