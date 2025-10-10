import type * as vscode from 'vscode-languageserver-protocol'
import type { LanguageServicePlugin } from '@volar/language-service'
import { URI } from 'vscode-uri'
import { MpxVirtualCode, Sfc, tsCodegen } from '@mpxjs/language-core'
import { isMpPluginComponentPath } from '../utils'

export function create(): LanguageServicePlugin {
  return {
    name: 'mpx-template-links',

    capabilities: {
      documentLinkProvider: {},
    },

    create(context) {
      return {
        async provideDocumentLinks(document) {
          const uri = URI.parse(document.uri)
          const decoded = context.decodeEmbeddedDocumentUri(uri)
          if (!decoded) {
            return
          }
          const [documentUri, embeddedCodeId] = decoded
          const sourceScript = context.language.scripts.get(documentUri)
          const virtualCode =
            sourceScript?.generated?.embeddedCodes.get(embeddedCodeId)
          if (!sourceScript?.generated || virtualCode?.id !== 'template') {
            return
          }
          const root = sourceScript.generated.root
          if (!(root instanceof MpxVirtualCode)) {
            return
          }

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
              style: Sfc['styles'][number]
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
                  decoded![0],
                  'style_' + style.index,
                )
                const styleVirtualCode =
                  sourceScript.generated.embeddedCodes.get(
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
                      decoded![0],
                      'style_' + style.index,
                    ) +
                    `#L${start.line + 1},${start.character + 1}-L${end.line + 1},${end.character + 1}`,
                })
              }
            }
          }
          // #endregion

          // #region document link for component tag
          const templateNodeTags =
            codegen?.getGeneratedTemplate()?.templateNodeTags ?? []
          const { result: usingComponents } =
            (await sfc.json?.resolvedUsingComponents) || {}
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
              const rawComponentPaths = usingComponents.get(componentTag)!

              // 根据 text 字段去重，创建一个映射表保存唯一的路径
              const uniqueComponentMap = new Map<
                string,
                {
                  componentPath: string
                  targetFilePath: string
                  id: number
                }
              >()

              let _index = 1
              rawComponentPaths.forEach(path => {
                if (!uniqueComponentMap.has(path.text) && path.realFilename) {
                  uniqueComponentMap.set(path.text, {
                    componentPath: path.text,
                    targetFilePath: path.realFilename,
                    id: _index++,
                  })
                }
              })

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
      }
    },
  }
}
