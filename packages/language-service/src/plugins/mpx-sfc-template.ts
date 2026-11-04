import type * as vscode from 'vscode-languageserver-protocol'
import type {
  Disposable,
  LanguageServiceContext,
} from '@volar/language-service'
import type {
  ComponentPropInfo,
  IRequests,
} from '@mpxjs/typescript-plugin/src/requests'
import type { TextDocument } from 'vscode-languageserver-textdocument'
import * as html from 'vscode-html-languageservice'
import { camelize, capitalize, getAtModeBaseName } from '@mpxjs/language-shared'
import { hyphenateTag } from '@mpxjs/language-core'
import { create as createHtmlService } from 'volar-service-html'
import { LanguageServicePlugin, SfcJsonBlockUsingComponents } from '../types'
import templateBuiltinData from '../data/template'
import { templateCodegenHelper } from '../utils/templateCodegenHelper'
import { formatWithBracketSpacing, prettierEnabled } from '../utils/formatter'

export function create(
  getTsClient: (context: LanguageServiceContext) => IRequests | undefined,
): LanguageServicePlugin {
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
  const htmlParser = html.getLanguageService({
    useDefaultDataProvider: false,
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
      let customDataUpdateId = 0
      const isCustomDataRequestCurrent = (
        updateId: number,
        token?: vscode.CancellationToken,
      ) => !token?.isCancellationRequested && updateId === customDataUpdateId

      const runUpdateExtraCustomData = (
        usingComponents?: SfcJsonBlockUsingComponents,
        componentProps?: Map<string, ComponentPropInfo[]>,
        mode: 'completion' | 'hover' = 'completion',
        typeComponents: string[] = [],
        applicationComponents?: SfcJsonBlockUsingComponents,
      ) => {
        const getAttributes = (componentTag: string) =>
          (componentProps?.get(componentTag) ?? [])
            .filter(prop => !prop.isAttribute)
            .map(prop =>
              toAttributeData(
                prop,
                mode === 'completion' ||
                  (usingComponents?.get(componentTag)?.length ?? 0) > 1,
              ),
            )

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
                    value: `自定义组件（${applicationComponents?.get(componentTag) === componentPaths ? '应用全局' : '局部注册'}）：\n- ${componentPaths.map(p => p.text).join('\n- ')}`,
                  },
                  attributes: getAttributes(componentTag),
                })
              }
            }
            const jsonNames = new Set(
              [...(usingComponents?.keys() ?? [])].map(name =>
                capitalize(camelize(name)),
              ),
            )
            for (const name of typeComponents) {
              if (jsonNames.has(capitalize(camelize(name)))) continue
              for (const tag of new Set([name, hyphenateTag(name)])) {
                tags.push({
                  name: tag,
                  description: '类型声明组件',
                  attributes: getAttributes(tag),
                })
              }
            }
            return tags
          },
          provideAttributes: getAttributes,
          provideValues: (componentTag, attribute) =>
            getAttributes(componentTag).find(item => item.name === attribute)
              ?.values ?? [],
        })
      }

      const updateCustomDataAtPosition = async (
        document: TextDocument,
        position: vscode.Position,
        mode: 'completion' | 'hover',
        token?: vscode.CancellationToken,
      ) => {
        const updateId = ++customDataUpdateId
        const helper = templateCodegenHelper(context, document.uri)
        const client = getTsClient(context)
        const usingComponents =
          helper?.sfc.usingComponents ?? helper?.sfc.json?.usingComponents
        const typeComponents =
          helper && mode === 'completion' && !token?.isCancellationRequested
            ? ((await client?.getComponentNames?.(helper.documentUri.fsPath)) ??
              [])
            : []
        if (!isCustomDataRequestCurrent(updateId, token)) return
        const tagContext = getTagContextAtPosition(document, position)
        const componentTag = tagContext?.tag
        const componentProps = new Map<string, ComponentPropInfo[]>()
        const hasMultipleComponentCandidates =
          componentTag !== undefined &&
          (usingComponents?.get(componentTag)?.length ?? 0) > 1

        if (
          helper &&
          componentTag &&
          tagContext.isAfterTagName &&
          (usingComponents?.has(componentTag) ||
            typeComponents.some(
              name =>
                name === componentTag || hyphenateTag(name) === componentTag,
            )) &&
          (mode === 'completion' || hasMultipleComponentCandidates) &&
          !token?.isCancellationRequested
        ) {
          const props = await client?.getComponentProps(
            helper.documentUri.fsPath,
            componentTag,
          )
          if (props?.length) {
            componentProps.set(componentTag, props)
          }
        }

        if (!isCustomDataRequestCurrent(updateId, token)) {
          return
        }

        runUpdateExtraCustomData(
          usingComponents,
          componentProps,
          mode,
          typeComponents,
          helper?.sfc.application?.json.usingComponents,
        )
        return {
          updateId,
          usingComponents,
          applicationComponents: helper?.sfc.application?.json.usingComponents,
          typeComponents,
          attributeCondition: tagContext?.attributeCondition,
        }
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
          const customData = await updateCustomDataAtPosition(
            document,
            position,
            'completion',
            token,
          )
          if (!customData) {
            return
          }
          let htmlComplete = await baseServiceInstance.provideCompletionItems?.(
            document,
            position,
            completionContext,
            token,
          )
          if (!isCustomDataRequestCurrent(customData.updateId, token)) {
            return
          }
          if (
            !htmlComplete?.items.length &&
            !document.getText().slice(0, document.offsetAt(position)).trim()
          ) {
            htmlComplete = {
              isIncomplete: false,
              items: [
                ...mpxBuiltinTagsCompleteItems,
                ...extraCustomData
                  .flatMap(provider => provider.provideTags())
                  .map(tag => ({
                    label: tag.name,
                    insertText: `<${tag.name}>$1</${tag.name}>`,
                    insertTextFormat: 2 as const,
                    kind: 10 as const,
                  })),
              ],
            }
          }
          htmlComplete?.items.forEach(item => {
            if (
              customData.attributeCondition &&
              item.textEdit?.newText.startsWith(item.label)
            ) {
              item.textEdit.newText =
                item.label +
                customData.attributeCondition +
                item.textEdit.newText.slice(item.label.length)
            }
            if (customData.usingComponents?.has(item.label)) {
              const componentPaths = customData.usingComponents.get(item.label)
              if (componentPaths?.length) {
                item.labelDetails = {
                  description:
                    customData.applicationComponents?.get(item.label) ===
                    componentPaths
                      ? '应用全局组件'
                      : '局部注册组件',
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
          const customData = await updateCustomDataAtPosition(
            document,
            position,
            'hover',
            token,
          )
          if (!customData) {
            return
          }
          const res = await baseServiceInstance.provideHover?.(
            document,
            position,
            token,
          )
          if (!isCustomDataRequestCurrent(customData.updateId, token)) {
            return
          }
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

          if (res?.[0]?.newText) {
            res[0].newText = await formatWithBracketSpacing(
              context,
              res[0].newText,
            )
          }
          return res
        },

        /**
         * 去除 HTML 内置标签 src、href 等属性的跳转功能，避免与插值代码 {{ xxx }} 内的变量跳转冲突
         * 比如 <image src="{{ imgsrc }}">、<a href="{{ link }}"> 等等
         */
        async provideDocumentLinks(document, token) {
          if (document.languageId !== 'html') {
            return
          }

          const baseLinks = await baseServiceInstance.provideDocumentLinks?.(
            document,
            token,
          )

          if (!baseLinks?.length) {
            return baseLinks
          }

          return baseLinks.filter(link => {
            const linkText = document.getText(link.range)
            if (/\{\s*\{.*?\}\s*\}/.test(linkText)) {
              // 如果包含 {{}}，禁用跳转，包括有空格的情况，eg: " { { xx }} "
              return false
            }
            return true
          })
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

  function getTagContextAtPosition(
    document: TextDocument,
    position: vscode.Position,
  ) {
    const offset = document.offsetAt(position)
    const node = htmlParser.parseHTMLDocument(document).findNodeAt(offset)
    if (
      !node?.tag ||
      offset <= node.start ||
      (node.startTagEnd !== undefined && offset > node.startTagEnd)
    ) {
      return
    }
    let attributeCondition: string | undefined
    const scanner = htmlParser.createScanner(document.getText(), node.start)
    let token = scanner.scan()
    while (token !== html.TokenType.EOS && scanner.getTokenOffset() <= offset) {
      if (
        token === html.TokenType.AttributeName &&
        offset <= scanner.getTokenEnd()
      ) {
        const name = scanner.getTokenText()
        const baseName = getAtModeBaseName(name)
        if (
          baseName !== name &&
          offset <= scanner.getTokenOffset() + baseName.length
        ) {
          attributeCondition = name.slice(baseName.length)
        }
        break
      }
      token = scanner.scan()
    }
    return {
      tag: node.tag,
      attributeCondition,
      // Component props are only needed for attribute completion / hover. Asking
      // tsserver for them while editing the tag name can repeatedly force project
      // analysis and make tag completion appear to hang.
      isAfterTagName: offset > node.start + 1 + node.tag.length,
    }
  }

  function toAttributeData(
    prop: ComponentPropInfo,
    includeDescription: boolean,
  ): html.IAttributeData {
    const description: string[] = []
    if (prop.type) {
      description.push(
        `\`${prop.name}${prop.required ? '' : '?'}: ${prop.type}\``,
      )
    }
    if (prop.deprecated) {
      description.push('**@deprecated**')
    }
    if (prop.commentMarkdown) {
      description.push(prop.commentMarkdown)
    }

    return {
      name: prop.name,
      description:
        includeDescription && description.length
          ? {
              kind: 'markdown',
              value: description.join('\n\n'),
            }
          : undefined,
      values: prop.values?.map(name => ({ name })),
    }
  }
}
