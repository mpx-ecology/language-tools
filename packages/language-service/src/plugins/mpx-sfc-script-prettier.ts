import type { LanguageServicePlugin } from '@volar/language-service'
import { URI } from 'vscode-uri'
import { create as baseCreate } from 'volar-service-prettier'

export function create(): LanguageServicePlugin {
  // TODO prettierInstanceOrGetter resolve prettier
  const base = baseCreate(() => import('prettier'), {
    documentSelector: ['typescript', 'javascript'],
    isFormattingEnabled: async (prettier, document, context) => {
      const enablePrettier =
        (await context.env.getConfiguration?.('mpx.format.script.prettier')) ??
        false
      if (!enablePrettier) {
        // 默认关闭 prettier 格式化
        return false
      }
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
    getFormattingOptions: async (
      prettier,
      document,
      formatOptions,
      context,
    ) => {
      const parsed = URI.parse(document.uri)
      const uri = context.decodeEmbeddedDocumentUri(parsed)?.[0] ?? parsed
      const configOptions =
        uri.scheme === 'file'
          ? await prettier.resolveConfig(uri.fsPath, { useCache: false })
          : null
      const editorOptions: Record<string, any> =
        (await context.env.getConfiguration?.('prettier', uri.toString())) ?? {}
      return {
        filepath: uri.scheme === 'file' ? uri.fsPath : undefined,
        tabWidth: formatOptions.tabSize,
        useTabs: !formatOptions.insertSpaces,
        ...editorOptions,
        ...configOptions,
        parser: 'typescript',
      }
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
          // 暂时仅针对 script 部分允许 prettier 格式化（json-js 部分是否需要可以看后续用户反馈）
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
