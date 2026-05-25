import type { LanguageServicePlugin } from '@volar/language-service'
import { URI } from 'vscode-uri'
import { MpxVirtualCode, tsCodegen } from '@mpxjs/language-core'
import { isMpPluginComponentPath } from '../utils'

export function create(): LanguageServicePlugin {
  return {
    name: 'mpx-component-definition',

    capabilities: {
      definitionProvider: true,
    },

    create(context) {
      return {
        async provideDefinition(document, position) {
          const uri = URI.parse(document.uri)
          const decoded = context.decodeEmbeddedDocumentUri(uri)
          if (!decoded) {
            return
          }
          const [documentUri, embeddedCodeId] = decoded
          const sourceScript = context.language.scripts.get(documentUri)
          const root = sourceScript?.generated?.root
          if (!(root instanceof MpxVirtualCode)) {
            return
          }

          if (/json_(js|json)/.test(embeddedCodeId)) {
            return provideJsonDefinition(root, document, position)
          }

          const virtualCode =
            sourceScript?.generated?.embeddedCodes.get(embeddedCodeId)
          if (virtualCode?.id === 'template') {
            return provideTemplateDefinition(root, document, position)
          }
        },
      }

      async function provideJsonDefinition(
        root: MpxVirtualCode,
        document: any,
        position: any,
      ) {
        if (!root.sfc.json) {
          return
        }
        const offset = document.offsetAt(position)
        const { result: resolvedUsingComponents } =
          (await root.sfc.json.resolvedUsingComponents) || {}
        if (!resolvedUsingComponents?.size) {
          return
        }

        for (const [_, componentsArray] of resolvedUsingComponents) {
          for (const {
            text,
            offset: compOffset,
            realFilename,
          } of componentsArray) {
            if (!realFilename || isMpPluginComponentPath(text)) {
              continue
            }
            if (offset >= compOffset && offset <= compOffset + text.length) {
              return [
                {
                  targetUri: URI.file(realFilename).toString(),
                  targetRange: {
                    start: { line: 0, character: 0 },
                    end: { line: 0, character: 0 },
                  },
                  targetSelectionRange: {
                    start: { line: 0, character: 0 },
                    end: { line: 0, character: 0 },
                  },
                  originSelectionRange: {
                    start: document.positionAt(compOffset),
                    end: document.positionAt(compOffset + text.length),
                  },
                },
              ]
            }
          }
        }
      }

      async function provideTemplateDefinition(
        root: MpxVirtualCode,
        document: any,
        position: any,
      ) {
        const { sfc } = root
        const codegen = tsCodegen.get(sfc)
        const templateNodeTags =
          codegen?.getGeneratedTemplate()?.templateNodeTags ?? []
        const { result: usingComponents } =
          (await sfc.json?.resolvedUsingComponents) || {}
        if (!usingComponents?.size) {
          return
        }

        const offset = document.offsetAt(position)

        for (const { name, startTagOffset, endTagOffset } of templateNodeTags) {
          if (!usingComponents.has(name) || !startTagOffset) {
            continue
          }
          const onStartTag =
            offset >= startTagOffset && offset <= startTagOffset + name.length
          const onEndTag =
            endTagOffset &&
            offset >= endTagOffset &&
            offset <= endTagOffset + name.length
          if (!onStartTag && !onEndTag) {
            continue
          }

          const componentsArray = usingComponents.get(name)!
          for (const { text, realFilename } of componentsArray) {
            if (!realFilename || isMpPluginComponentPath(text)) {
              continue
            }
            const tagOffset = onStartTag ? startTagOffset : endTagOffset!
            return [
              {
                targetUri: URI.file(realFilename).toString(),
                targetRange: {
                  start: { line: 0, character: 0 },
                  end: { line: 0, character: 0 },
                },
                targetSelectionRange: {
                  start: { line: 0, character: 0 },
                  end: { line: 0, character: 0 },
                },
                originSelectionRange: {
                  start: document.positionAt(tagOffset),
                  end: document.positionAt(tagOffset + name.length),
                },
              },
            ]
          }
        }
      }
    },
  }
}
