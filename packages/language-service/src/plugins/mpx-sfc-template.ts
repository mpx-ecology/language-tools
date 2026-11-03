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
import { getAtModeBaseName } from '@mpxjs/language-shared'
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
  let attributeAlias: { tag: string; names: string[] } | undefined
  const builtinProvider: html.IHTMLDataProvider = {
    ...mpxBuiltinData,
    getId: () => mpxBuiltinData.getId(),
    isApplicable: id => mpxBuiltinData.isApplicable(id),
    provideTags: () => mpxBuiltinData.provideTags(),
    provideAttributes: tag =>
      attributeAlias?.tag === tag ? [] : mpxBuiltinData.provideAttributes(tag),
    provideValues: (tag, attr) =>
      attributeAlias?.tag === tag
        ? []
        : mpxBuiltinData.provideValues(tag, attr),
  }

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
      return [...extraCustomData, builtinProvider, ...htmlBuiltinData]
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
        alias?: { tag: string; names: string[] },
      ) => {
        attributeAlias = alias
        const getComponentAttributes = (componentTag: string) =>
          (componentProps?.get(componentTag) ?? [])
            .filter(prop => !prop.isAttribute)
            .map(prop =>
              toAttributeData(
                prop,
                mode === 'completion' ||
                  (alias?.names.length ?? 0) > 1 ||
                  (usingComponents?.get(componentTag)?.length ?? 0) > 1,
              ),
            )

        const getAttributes = (tag: string) =>
          alias?.tag === tag
            ? mergeTagAttributes(
                alias.names.map(name => ({
                  name,
                  attributes: [
                    ...getComponentAttributes(name),
                    ...(usingComponents?.has(name)
                      ? []
                      : mpxBuiltinData.provideAttributes(name)),
                  ],
                })),
              )
            : getComponentAttributes(tag)
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
                  attributes: getAttributes(componentTag),
                })
              }
            }
            if (alias)
              tags.push({
                name: alias.tag,
                attributes: getAttributes(alias.tag),
              })
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
        const usingComponents = helper?.sfc.json?.usingComponents
        const tagContext = getTagContextAtPosition(document, position)
        const identities =
          helper?.codegen
            ?.getGeneratedTemplate()
            ?.templateNodeTags.filter(
              tag =>
                tagContext &&
                (tag.sourceTag?.startTagOffset === tagContext.start + 1 ||
                  tag.startTagOffset === tagContext.start + 1),
            ) ?? []
        const names = identities.length
          ? [...new Set(identities.map(tag => tag.name))]
          : tagContext
            ? [tagContext.tag]
            : []
        const alias =
          tagContext && identities.some(tag => tag.sourceTag)
            ? { tag: tagContext.tag, names }
            : undefined
        const componentTag = tagContext?.tag
        const componentProps = new Map<string, ComponentPropInfo[]>()

        for (const name of names) {
          const hasMultipleComponentCandidates =
            (usingComponents?.get(name)?.length ?? 0) > 1
          if (
            helper &&
            componentTag &&
            tagContext.isAfterTagName &&
            usingComponents?.has(name) &&
            (mode === 'completion' ||
              hasMultipleComponentCandidates ||
              names.length > 1) &&
            !token?.isCancellationRequested
          ) {
            const props = await getTsClient(context)?.getComponentProps(
              helper.documentUri.fsPath,
              name,
            )
            if (props?.length) componentProps.set(name, props)
          }
        }

        if (!isCustomDataRequestCurrent(updateId, token)) {
          return
        }

        runUpdateExtraCustomData(usingComponents, componentProps, mode, alias)
        return {
          updateId,
          usingComponents,
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
          const valueRange = getTagNameValueRange(document, position)
          if (valueRange) {
            const helper = templateCodegenHelper(context, document.uri)
            const names = new Set([
              ...mpxBuiltinTagsSet,
              ...(customData.usingComponents?.keys() ?? []),
              ...(helper
                ? ((await getTsClient(context)?.getComponentNames(
                    helper.documentUri.fsPath,
                  )) ?? [])
                : []),
            ])
            if (!isCustomDataRequestCurrent(customData.updateId, token)) return
            return {
              isIncomplete: false,
              items: [...names].map(name => ({
                label: name,
                kind: 7,
                textEdit: { range: valueRange, newText: name },
              })),
            }
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
              items: mpxBuiltinTagsCompleteItems ?? [],
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
      start: node.start,
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

function getTagNameValueRange(
  document: TextDocument,
  position: vscode.Position,
) {
  const offset = document.offsetAt(position)
  const scanner = html
    .getLanguageService({ useDefaultDataProvider: false })
    .createScanner(document.getText())
  let attribute = ''
  for (
    let token = scanner.scan();
    token !== html.TokenType.EOS;
    token = scanner.scan()
  ) {
    if (scanner.getTokenOffset() > offset) break
    if (token === html.TokenType.AttributeName)
      attribute = scanner.getTokenText()
    if (
      token === html.TokenType.AttributeValue &&
      getAtModeBaseName(attribute) === 'mpxTagName'
    ) {
      const value = scanner.getTokenText()
      const quoted = value.startsWith('"') || value.startsWith("'")
      const start = scanner.getTokenOffset() + (quoted ? 1 : 0)
      const end =
        scanner.getTokenEnd() -
        (quoted && value.length > 1 && value.endsWith(value[0]) ? 1 : 0)
      if (
        offset >= start &&
        offset <= end &&
        /^[\w:-]*$/.test(document.getText().slice(start, end))
      ) {
        return {
          start: document.positionAt(start),
          end: document.positionAt(end),
        }
      }
    }
  }
}

function mergeTagAttributes(
  tags: { name: string; attributes: html.IAttributeData[] }[],
) {
  if (tags.length === 1) return tags[0].attributes
  const result = new Map<string, html.IAttributeData>()
  for (const tag of tags) {
    for (const attribute of tag.attributes) {
      const description =
        typeof attribute.description === 'string'
          ? attribute.description
          : attribute.description?.value
      const previous = result.get(attribute.name)
      const previousDescription =
        typeof previous?.description === 'string'
          ? previous.description
          : previous?.description?.value
      result.set(attribute.name, {
        ...attribute,
        description: {
          kind: 'markdown',
          value: [
            previousDescription,
            `**${tag.name}**\n\n${description ?? ''}`,
          ]
            .filter(Boolean)
            .join('\n\n'),
        },
        values: [
          ...new Map(
            [...(previous?.values ?? []), ...(attribute.values ?? [])].map(
              value => [value.name, value],
            ),
          ).values(),
        ],
      })
    }
  }
  return [...result.values()]
}
