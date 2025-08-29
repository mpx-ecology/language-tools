import type { LanguageServicePlugin } from '@volar/language-service'
import { URI } from 'vscode-uri'
import { create as baseCreate } from 'volar-service-prettier'

export function create(): LanguageServicePlugin {
  // TODO prettierInstanceOrGetter resolve prettier
  const base = baseCreate(() => import('prettier'), {
    documentSelector: ['typescript', 'javascript'],
    isFormattingEnabled: async (prettier, document, context) => {
      const parsed = URI.parse(document.uri)
      const uri = context.decodeEmbeddedDocumentUri(parsed)?.[0] ?? parsed
      if (uri.scheme === 'file') {
        const fileInfo = await prettier.getFileInfo(uri.fsPath, {
          ignorePath: '.prettierignore',
          resolveConfig: false,
        })
        if (fileInfo.ignored) {
          return false
        }
      }
      return true
    },
  })

  return {
    name: 'mpx-script-prettier',

    capabilities: base.capabilities,

    create(context) {
      if (!context.project.mpx) {
        return {}
      }

      const baseInstance = base.create(context)

      // TODO 新增 prettier 格式化开启选项
      return {
        ...baseInstance,

        async provideDocumentFormattingEdits(
          document,
          range,
          options,
          embeddedCodeContext,
          token,
        ) {
          if (
            document.languageId !== 'typescript' &&
            document.languageId !== 'javascript'
          ) {
            return
          }

          const uri = URI.parse(document.uri)
          const decoded = context.decodeEmbeddedDocumentUri(uri)
          if (!decoded) {
            return
          }
          const [, embeddedCodeId] = decoded
          if (!/script(setup)?_raw/.test(embeddedCodeId)) {
            return
          }

          const res = await baseInstance.provideDocumentFormattingEdits?.(
            document,
            range,
            options,
            embeddedCodeContext,
            token,
          )

          // TODO 根据 'mpx.format.script.initialIndent' 整体缩进
          if (res?.[0]?.newText) {
            res[0].newText = '\n' + res[0].newText
          }

          return res
        },
      }
    },
  }
}
