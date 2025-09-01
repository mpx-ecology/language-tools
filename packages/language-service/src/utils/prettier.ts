import type { TextDocument } from 'vscode-languageserver-textdocument'
import type { LanguageServiceContext } from '@volar/language-service'
import { URI } from 'vscode-uri'

export async function prettierEnabled(
  document: TextDocument,
  context: LanguageServiceContext,
): Promise<boolean> {
  if (
    document.languageId !== 'typescript' &&
    document.languageId !== 'javascript'
  ) {
    return false
  }

  const uri = URI.parse(document.uri)
  const decoded = context.decodeEmbeddedDocumentUri(uri)
  if (!decoded) {
    return false
  }

  const [_, embeddedCodeId] = decoded

  if (
    embeddedCodeId === 'script_raw' ||
    embeddedCodeId === 'scriptsetup_raw' ||
    embeddedCodeId === 'json_js'
  ) {
    // script_js/ts json_js 部分允许 prettier 格式化
    const enablePrettierConfig: boolean =
      (await context.env.getConfiguration?.('mpx.format.script.prettier')) ??
      false

    return enablePrettierConfig
  }

  return false
}
