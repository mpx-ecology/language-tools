import type * as vscode from 'vscode-languageserver-protocol'
import type {
  LanguageServiceContext,
  LanguageServicePlugin,
} from '@volar/language-service'
import { URI } from 'vscode-uri'
import {
  MpxVirtualCode,
  SfcJsonBlockUsingComponents,
  tsCodegen,
} from '@mpxjs/language-core'
import { isMpPluginComponentPath } from '../utils'

export function create(): LanguageServicePlugin {
  return {
    name: 'mpx-template-links',

    capabilities: {
      documentLinkProvider: {},
      definitionProvider: true,
    },

    create(context) {
      return {
        async provideDocumentLinks(document) {
          const tplCtx = await resolveTemplateContext(context, document.uri)
          if (!tplCtx) {
            return
          }
          const {
            decoded,
            sourceScript,
            root,
            templateNodeTags,
            usingComponents,
          } = tplCtx

          const result: vscode.DocumentLink[] = []
          const { sfc } = root
          const codegen = tsCodegen.get(sfc)

          // #region document link for style class
          const scopedClasses =
            codegen?.getGeneratedTemplate()?.scopedClasses ?? []
          const styleClasses = new Map<
            string,
            {
              index: number
              style: (typeof sfc.styles)[number]
              classOffset: number
            }[]
          >()
          const option =
            root.mpxCompilerOptions.experimentalResolveStyleCssClasses

          for (let i = 0; i < sfc.styles.length; i++) {
            const style = sfc.styles[i]
            if (option === 'always' || (option === 'scoped' && style.scoped)) {
              for (const className of style.classNames) {
                if (!styleClasses.has(className.text.slice(1))) {
                  styleClasses.set(className.text.slice(1), [])
                }
                styleClasses.get(className.text.slice(1))!.push({
                  index: i,
                  style,
                  classOffset: className.offset,
                })
              }
            }
          }

          for (const { className, offset } of scopedClasses) {
            const styles = styleClasses.get(className)
            if (styles) {
              for (const style of styles) {
                const styleDocumentUri = context.encodeEmbeddedDocumentUri(
                  decoded[0],
                  'style_' + style.index,
                )
                const styleVirtualCode =
                  sourceScript.generated!.embeddedCodes.get(
                    'style_' + style.index,
                  )
                if (!styleVirtualCode) {
                  continue
                }
                const styleDocument = context.documents.get(
                  styleDocumentUri,
                  styleVirtualCode.languageId,
                  styleVirtualCode.snapshot,
                )
                const start = styleDocument.positionAt(style.classOffset)
                const end = styleDocument.positionAt(
                  style.classOffset + className.length + 1,
                )
                result.push({
                  range: {
                    start: document.positionAt(offset),
                    end: document.positionAt(offset + className.length),
                  },
                  target:
                    context.encodeEmbeddedDocumentUri(
                      decoded[0],
                      'style_' + style.index,
                    ) +
                    `#L${start.line + 1},${start.character + 1}-L${end.line + 1},${end.character + 1}`,
                })
              }
            }
          }
          // #endregion

          // #region document link for component tag
          if (usingComponents?.size) {
            for (const nodeTag of templateNodeTags) {
              const {
                name: componentTag,
                startTagOffset,
                endTagOffset,
              } = nodeTag
              if (!usingComponents.has(componentTag) || !startTagOffset) {
                continue
              }
              const uniqueComponentMap = dedupeComponentPaths(
                usingComponents.get(componentTag)!,
              )
              const uniqueComponentCount = uniqueComponentMap.size

              for (const [
                componentPath,
                { targetFilePath, id },
              ] of uniqueComponentMap.entries()) {
                if (isMpPluginComponentPath(componentPath)) {
                  // Fix #70 plugin 组件路径不处理
                  continue
                }
                const addLink = (offset: number) => {
                  result.push({
                    range: {
                      start: document.positionAt(offset),
                      end: document.positionAt(offset + componentTag.length),
                    },
                    target: URI.file(targetFilePath).toString(),
                    tooltip:
                      '自定义组件' +
                      (uniqueComponentCount > 1
                        ? `（来源 ${id}/${uniqueComponentCount}）`
                        : '') +
                      `：${componentPath}`,
                  })
                }
                addLink(startTagOffset)
                if (endTagOffset) {
                  addLink(endTagOffset)
                }
              }
            }
          }
          // #endregion

          return result
        },

        /**
         * 在 <template> 中对自定义组件标签提供「转到定义」(F12 / 右键转到定义)。
         * documentLinkProvider 仅响应 Ctrl/Cmd 点击,不参与 LSP textDocument/definition,
         * 所以基于同样的 templateNodeTags + resolvedUsingComponents 再提供一份。
         */
        async provideDefinition(document, position) {
          const tplCtx = await resolveTemplateContext(context, document.uri)
          if (!tplCtx) {
            return
          }
          const { templateNodeTags, usingComponents } = tplCtx
          if (!usingComponents?.size || !templateNodeTags.length) {
            return
          }

          const offset = document.offsetAt(position)
          const definitions: vscode.LocationLink[] = []

          for (const nodeTag of templateNodeTags) {
            const { name: componentTag } = nodeTag
            if (!usingComponents.has(componentTag)) {
              continue
            }
            const hitOffset = getTagHitOffset(nodeTag, offset)
            if (hitOffset == null) {
              continue
            }

            const uniqueComponentMap = dedupeComponentPaths(
              usingComponents.get(componentTag)!,
            )
            for (const [
              componentPath,
              { targetFilePath },
            ] of uniqueComponentMap) {
              if (isMpPluginComponentPath(componentPath)) continue
              definitions.push({
                originSelectionRange: {
                  start: document.positionAt(hitOffset),
                  end: document.positionAt(hitOffset + componentTag.length),
                },
                targetUri: URI.file(targetFilePath).toString(),
                targetRange: {
                  start: { line: 0, character: 0 },
                  end: { line: 0, character: 0 },
                },
                targetSelectionRange: {
                  start: { line: 0, character: 0 },
                  end: { line: 0, character: 0 },
                },
              })
            }
            // 命中且已收集完成,无需继续遍历
            if (definitions.length) break
          }

          return definitions.length ? definitions : undefined
        },
      }
    },
  }
}

interface TemplateNodeTag {
  name: string
  startTagOffset?: number
  endTagOffset?: number
}

/**
 * 解析 template 嵌入块的公共上下文,documentLink 与 definition 共用。
 * 非 template 嵌入块或非 MpxVirtualCode 时返回 null。
 */
async function resolveTemplateContext(
  context: LanguageServiceContext,
  rawUri: string,
) {
  const uri = URI.parse(rawUri)
  const decoded = context.decodeEmbeddedDocumentUri(uri)
  if (!decoded) return null
  const [documentUri, embeddedCodeId] = decoded
  const sourceScript = context.language.scripts.get(documentUri)
  const virtualCode = sourceScript?.generated?.embeddedCodes.get(embeddedCodeId)
  if (!sourceScript?.generated || virtualCode?.id !== 'template') {
    return null
  }
  const root = sourceScript.generated.root
  if (!(root instanceof MpxVirtualCode)) {
    return null
  }
  const codegen = tsCodegen.get(root.sfc)
  const templateNodeTags: TemplateNodeTag[] =
    codegen?.getGeneratedTemplate()?.templateNodeTags ?? []
  const { result: usingComponents } =
    (await root.sfc.json?.resolvedUsingComponents) || {}

  return {
    decoded,
    sourceScript,
    root,
    templateNodeTags,
    usingComponents: usingComponents as SfcJsonBlockUsingComponents | undefined,
  }
}

/**
 * 判断光标是否落在标签名 range(开始或结束标签)内,返回对应起始 offset。
 */
function getTagHitOffset(
  nodeTag: TemplateNodeTag,
  cursorOffset: number,
): number | null {
  const { name, startTagOffset, endTagOffset } = nodeTag
  if (
    startTagOffset != null &&
    cursorOffset >= startTagOffset &&
    cursorOffset <= startTagOffset + name.length
  ) {
    return startTagOffset
  }
  if (
    endTagOffset != null &&
    cursorOffset >= endTagOffset &&
    cursorOffset <= endTagOffset + name.length
  ) {
    return endTagOffset
  }
  return null
}

/**
 * 按 text 去重,丢弃没有 realFilename 的项,并记录序号便于 tooltip 标注来源。
 */
function dedupeComponentPaths(
  rawComponentPaths: { text: string; realFilename?: string }[],
): Map<string, { componentPath: string; targetFilePath: string; id: number }> {
  const map = new Map<
    string,
    { componentPath: string; targetFilePath: string; id: number }
  >()
  let id = 1
  for (const path of rawComponentPaths) {
    if (!path.realFilename || map.has(path.text)) continue
    map.set(path.text, {
      componentPath: path.text,
      targetFilePath: path.realFilename,
      id: id++,
    })
  }
  return map
}
