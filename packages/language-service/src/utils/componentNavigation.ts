import type {
  ResolvedUsingComponentInfo,
  Sfc,
  UsingComponentInfo,
} from '@mpxjs/language-core'
import type { TextDocument } from 'vscode-languageserver-textdocument'
import { MpxVirtualCode, tsCodegen } from '@mpxjs/language-core'
import type { Hover, Range } from 'vscode-languageserver-protocol'
import { URI, Utils } from 'vscode-uri'
import { isMpPluginComponentPath } from './index'
import { getMpxSourceScript } from './templateCodegenHelper'

export function componentFileName(fileName: string) {
  return Utils.basename(URI.file(fileName))
}

export function jsonPathRange(
  document: TextDocument,
  info: UsingComponentInfo,
) {
  const [start, end] = info.sourceRange ?? [
    info.offset + 1,
    info.offset + 1 + info.text.length,
  ]
  return { start: document.positionAt(start), end: document.positionAt(end) }
}

/** Group by source range, then actual URI: aliases can share a registration. */
export function jsonPathTargets(
  document: TextDocument,
  json: NonNullable<Sfc['json']>,
) {
  const groups = new Map<
    string,
    {
      range: Range
      title: string
      files: Map<string, string>
    }
  >()
  function add(info: ResolvedUsingComponentInfo, title: string) {
    if (!info.realFilename || isMpPluginComponentPath(info.text)) return
    const range = jsonPathRange(document, info)
    const key = JSON.stringify(range)
    let group = groups.get(key)
    if (!group) groups.set(key, (group = { range, title, files: new Map() }))
    if (group.title !== title) group.title = '文件路径'
    group.files.set(URI.file(info.realFilename).toString(), info.realFilename)
  }
  for (const infos of json.resolvedUsingComponents?.result.values() ?? []) {
    for (const info of infos) add(info, '自定义组件')
  }
  for (const info of json.resolvedPages?.result ?? []) add(info, '页面路径')
  return [...groups.values()].map(group => ({
    range: group.range,
    title: group.title,
    files: [...group.files.values()],
  }))
}

/** Explicit hover links don't intercept Ctrl/Cmd+click on the source text. */
export function componentTargetsHover(
  range: Range,
  files: string[],
  title = '自定义组件',
): Hover {
  const names = files.map(componentFileName)
  const counts = new Map<string, number>()
  for (const name of names) counts.set(name, (counts.get(name) ?? 0) + 1)
  const links = files.map((file, index) => {
    const name = names[index]!
    // The same basename in different folders still needs an unambiguous label.
    const label = counts.get(name) === 1 ? name : file.replace(/\\/g, '/')
    const escaped = label
      .replace(/[\\[\]<>`*_]/g, '\\$&')
      .replace(/[\r\n]/g, ' ')
    return `- [${escaped}](<${URI.file(file).toString()}>)`
  })
  return {
    range,
    contents: {
      kind: 'markdown',
      value: `${title}（${files.length} 个目标）：\n\n${links.join('\n')}`,
    },
  }
}

/** Source ranges whose native DocumentLinks are omitted for multi-definition navigation. */
export function componentNavigationRanges(
  context: import('@volar/language-service').LanguageServiceContext,
  uri: URI,
): Range[] {
  const source = getMpxSourceScript(context, uri)
  const root = source?.generated?.root
  if (!(root instanceof MpxVirtualCode)) return []
  const snapshot = source!.snapshot
  const document = context.documents.get(uri, source!.languageId, snapshot)
  const ranges = new Map<string, Range>()
  function add(start: number, end: number) {
    if (start < end) {
      const range = {
        start: document.positionAt(start),
        end: document.positionAt(end),
      }
      ranges.set(JSON.stringify(range), range)
    }
  }
  const { sfc } = root
  const jsonCode = source?.generated?.embeddedCodes.get(
    `json_${sfc.json?.lang}`,
  )
  if (sfc.json && jsonCode) {
    const jsonDocument = context.documents.get(
      context.encodeEmbeddedDocumentUri(uri, jsonCode.id),
      jsonCode.languageId,
      jsonCode.snapshot,
    )
    for (const group of jsonPathTargets(jsonDocument, sfc.json)) {
      if (group.files.length > 1)
        add(
          sfc.json.startTagEnd + jsonDocument.offsetAt(group.range.start),
          sfc.json.startTagEnd + jsonDocument.offsetAt(group.range.end),
        )
    }
  }
  if (sfc.template) {
    const components =
      sfc.resolvedUsingComponents?.result ??
      sfc.json?.resolvedUsingComponents?.result
    const tags =
      tsCodegen.get(sfc)?.getGeneratedTemplate()?.templateNodeTags ?? []
    for (const tag of tags) {
      const targets = new Set(
        (components?.get(tag.name) ?? [])
          .filter(
            info => info.realFilename && !isMpPluginComponentPath(info.text),
          )
          .map(info => URI.file(info.realFilename!).toString()),
      )
      if (targets.size < 2) continue
      for (const offset of [tag.startTagOffset, tag.endTagOffset]) {
        if (offset != null)
          add(
            sfc.template.startTagEnd + offset,
            sfc.template.startTagEnd + offset + tag.name.length,
          )
      }
    }
  }
  return [...ranges.values()].sort(
    (a, b) =>
      a.start.line - b.start.line || a.start.character - b.start.character,
  )
}
