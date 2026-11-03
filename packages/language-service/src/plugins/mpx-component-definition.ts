import type { LanguageServicePlugin } from '@volar/language-service'
import type * as vscode from 'vscode-languageserver-protocol'
import type { TextDocument } from 'vscode-languageserver-textdocument'
import { URI } from 'vscode-uri'
import { MpxVirtualCode, tsCodegen } from '@mpxjs/language-core'
import { isMpPluginComponentPath } from '../utils'
import { jsonPathTargets } from '../utils/componentNavigation'

export function create(
  options: { template?: boolean } = {},
): LanguageServicePlugin {
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
          if (options.template !== false && virtualCode?.id === 'template') {
            return provideTemplateDefinition(root, document, position)
          }
        },
      }

      async function provideJsonDefinition(
        root: MpxVirtualCode,
        document: TextDocument,
        position: vscode.Position,
      ) {
        if (!root.sfc.json) {
          return
        }
        const offset = document.offsetAt(position)
        const definitions: vscode.LocationLink[] = []
        for (const group of jsonPathTargets(document, root.sfc.json)) {
          const start = document.offsetAt(group.range.start)
          const end = document.offsetAt(group.range.end)
          if (offset >= start && offset <= end) {
            for (const file of group.files)
              definitions.push(definition(file, document, start, end - start))
          }
        }
        return uniqueDefinitions(definitions)
      }

      async function provideTemplateDefinition(
        root: MpxVirtualCode,
        document: TextDocument,
        position: vscode.Position,
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
          if (!usingComponents.has(name) || startTagOffset == null) {
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

          const tagOffset = onStartTag ? startTagOffset : endTagOffset!
          return uniqueDefinitions(
            usingComponents
              .get(name)!
              .filter(
                info =>
                  info.realFilename && !isMpPluginComponentPath(info.text),
              )
              .map(info =>
                definition(
                  info.realFilename!,
                  document,
                  tagOffset,
                  name.length,
                ),
              ),
          )
        }
      }
    },
  }
}

function definition(
  fileName: string,
  document: TextDocument,
  offset: number,
  length: number,
): vscode.LocationLink {
  const start = { line: 0, character: 0 }
  return {
    targetUri: URI.file(fileName).toString(),
    targetRange: { start, end: start },
    targetSelectionRange: { start, end: start },
    originSelectionRange: {
      start: document.positionAt(offset),
      end: document.positionAt(offset + length),
    },
  }
}

function uniqueDefinitions(definitions: vscode.LocationLink[]) {
  const unique = new Map(
    definitions.map(item => [
      item.targetUri + JSON.stringify(item.targetSelectionRange),
      item,
    ]),
  )
  return unique.size ? [...unique.values()] : undefined
}
