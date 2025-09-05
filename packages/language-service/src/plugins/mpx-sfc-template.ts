import type * as vscode from 'vscode-languageserver-protocol'
import type { Disposable } from '@volar/language-service'
import * as html from 'vscode-html-languageservice'
import { create as createHtmlService } from 'volar-service-html'
import { LanguageServicePlugin, SfcJsonBlockUsingComponents } from '../types'
import templateBuiltinData from '../data/template'
import { templateCodegenHelper } from '../utils/templateCodegenHelper'
import { prettierEnabled } from '../utils/prettier'

export function create(): LanguageServicePlugin {
  const mpxBuiltinData = html.newHTMLDataProvider(
    'mpx-template-built-in',
    templateBuiltinData,
  )
  const mpxBuiltinTagsSet = new Set(
    templateBuiltinData?.tags?.map(tag => tag.name),
  )

  const mpxBuiltinTagsCompleteItems = Array.from(mpxBuiltinTagsSet).map(tag => {
    return {
      label: tag,
      detail: 'Mpx 内置组件',
      documentation: `<${tag}>|</${tag}>`,
      insertText: `<${tag}>\$1</${tag}>`,
      insertTextFormat: 2 satisfies typeof vscode.InsertTextFormat.Snippet,
      kind: 14 satisfies typeof vscode.CompletionItemKind.Keyword,
    } satisfies vscode.CompletionItem
  })

  let htmlBuiltinData = [html.getDefaultHTMLDataProvider()]
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
      return [...extraCustomData, mpxBuiltinData, ...htmlBuiltinData]
    },
    onDidChangeCustomData,
    async getFormattingOptions(_document, options, context) {
      const formatSettings: html.FormattingOptions = {
        ...options,
        endWithNewline: options.insertFinalNewline
          ? true
          : options.trimFinalNewlines
            ? false
            : undefined,
        ...(await context.env.getConfiguration?.('html.format')),
        ...((await context.env.getConfiguration?.('mpx.format.template')) ??
          {}),
      }
      if (formatSettings.contentUnformatted) {
        formatSettings.contentUnformatted =
          formatSettings.contentUnformatted + ',script'
      } else {
        formatSettings.contentUnformatted = 'script'
      }
      return formatSettings
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
          let htmlComplete = await baseServiceInstance.provideCompletionItems?.(
            document,
            position,
            completionContext,
            token,
          )
          if (!htmlComplete?.items.length) {
            htmlComplete = {
              isIncomplete: false,
              items: mpxBuiltinTagsCompleteItems ?? [],
            }
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

        async provideDocumentFormattingEdits(
          document,
          range,
          options,
          embeddedCodeContext,
          token,
        ) {
          if (document.languageId !== 'html') {
            return
          }

          if (await prettierEnabled(document, context)) {
            return
          }

          const res =
            await baseServiceInstance.provideDocumentFormattingEdits?.(
              document,
              range,
              options,
              embeddedCodeContext,
              token,
            )

          const bracketSpacing =
            (await context.env.getConfiguration?.(
              'mpx.format.template.bracketSpacing',
            )) ?? 'true'

          if (res?.[0]?.newText) {
            let newText = res[0].newText
            if (bracketSpacing !== 'preserve') {
              /**
               * bracketSpacing = true: xx="{{xxx}}" -> xx="{{ xxx }}"
               * bracketSpacing = false: xx="{{ xxx }}" -> xx="{{xxx}}"
               */
              newText = newText.replace(
                /="\s*{\s*{\s*(.+?)\s*}\s*}\s*"/g,
                bracketSpacing === 'true' ? '="{{ $1 }}"' : '="{{$1}}"',
              )
            }
            res[0].newText = newText
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
    const htmlBuiltinData2 = html.getDefaultHTMLDataProvider()
    // @ts-ignore
    htmlBuiltinData2._tags = htmlBuiltinData2._tags.filter(
      (htmlTag: html.ITagData) =>
        !mpxBuiltinTagsSet.has(htmlTag.name) &&
        !extraData.provideTags().some(tag => tag.name === htmlTag.name),
    )
    // @ts-ignore
    // 避免 html button type 补全时出现 bt 的 valueSet 冲突
    delete htmlBuiltinData2._valueSetMap?.['bt']
    extraCustomData = [extraData]
    htmlBuiltinData = [htmlBuiltinData2]
    onDidChangeCustomDataListeners.forEach(l => l())
  }
}
