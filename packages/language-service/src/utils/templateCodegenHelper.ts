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
  const sourceScript = context.language.scripts.get(documentUri)
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
    sfc,
  }
}
