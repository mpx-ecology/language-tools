import type { LanguageServiceContext } from '@volar/language-service'
import { MpxVirtualCode, tsCodegen } from '@mpxjs/language-core'
import { URI } from 'vscode-uri'

export const templateCodegenHelper = (
  context: LanguageServiceContext,
  dUri: any,
) => {
  const uri = URI.parse(dUri)
  const decoded = context.decodeEmbeddedDocumentUri(uri)
  if (!decoded) {
    return
  }
  const [documentUri, embeddedCodeId] = decoded
  const sourceScript = getMpxSourceScript(context, documentUri)
  const virtualCode = sourceScript?.generated?.embeddedCodes.get(embeddedCodeId)
  if (!sourceScript?.generated || virtualCode?.id !== 'template') {
    return
  }
  const root = sourceScript.generated.root
  if (!(root instanceof MpxVirtualCode)) {
    return
  }
  const { sfc } = root
  const codegen = tsCodegen.get(sfc)
  return {
    codegen,
    documentUri,
    sfc,
  }
}

/** Refresh only the known application dependency, without opening a TS Program.
 * JSON-only IDE projects intentionally do not analyze ordinary template requests.
 */
export function getMpxSourceScript(context: LanguageServiceContext, uri: URI) {
  let source = context.language.scripts.get(uri)
  const root = source?.generated?.root
  const application =
    root instanceof MpxVirtualCode ? root.sfc.application : undefined
  if (application) {
    const applicationUri =
      context.project?.typescript?.uriConverter.asUri(application.fileName) ??
      URI.file(application.fileName)
    context.language.scripts.get(applicationUri)
    source = context.language.scripts.get(uri)
  }
  return source
}
