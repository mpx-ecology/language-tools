import type { TextDocument } from 'vscode-languageserver-textdocument'
import type { LanguageServiceContext } from '@volar/language-service'
import { URI } from 'vscode-uri'

export async function prettierEnabled(
  document: TextDocument,
  context: LanguageServiceContext,
): Promise<boolean> {
  if (
    document.languageId !== 'typescript' &&
    document.languageId !== 'javascript' &&
    document.languageId !== 'html'
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
    // 开关1: <script_js/ts> <json_js> 部分开启 prettier 格式化
    const enablePrettierConfig: boolean =
      (await context.env.getConfiguration?.('mpx.format.script.prettier')) ??
      false

    return enablePrettierConfig
  }

  // 开关2: <template> 部分开启 prettier 格式化
  if (embeddedCodeId === 'template') {
    const enablePrettierConfig: boolean =
      (await context.env.getConfiguration?.('mpx.format.template.prettier')) ??
      false

    return enablePrettierConfig
  }

  return false
}
