import type { LanguageServicePlugin } from '@volar/language-service'
import type { Options } from 'prettier'
import { URI } from 'vscode-uri'
import { create as baseCreate } from 'volar-service-prettier'
import { prettierEnabled } from '../utils/prettier'

export function create(): LanguageServicePlugin {
  // <script> 缩进大小
  let baseIndentSpaces = '  '
  // 记录当前触发格式化的源文件绝对路径（用于就近解析项目内的 prettier）
  let lastFormatFilePath: string | undefined

  // 使用 require 实现：优先基于 lastFormatFilePath 就近解析项目的 prettier，失败再回退到内置动态导入
  const prettierInstanceOrGetter = async () => {
    if (!lastFormatFilePath) {
      return
    }
    try {
      const { createRequire } = await import('module')
      const { pathToFileURL } = await import('url')
      // 从当前文件路径开始 require prettier 模块
      const requireFrom = createRequire(pathToFileURL(lastFormatFilePath).href)
      const mod = requireFrom('prettier') as any
      return mod?.default ?? mod
    } catch {
      // ignore
    }
    console.error('[Mpx] Cannot resolve prettier from workspace.')
    return
  }

  const base = baseCreate(prettierInstanceOrGetter, {
    documentSelector: ['typescript', 'javascript'],
    isFormattingEnabled: async (prettier, document, context) => {
      if (!prettier) {
        console.error('[Mpx] prettier is not available')
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
      const res: Options = {
        filepath: uri.scheme === 'file' ? uri.fsPath : undefined,
        tabWidth: formatOptions.tabSize,
        useTabs: !formatOptions.insertSpaces,
        ...editorOptions,
        ...configOptions,
        parser: 'typescript',
      }
      const tabWidth = res.tabWidth ?? 2
      baseIndentSpaces = res.useTabs ? '\t' : ' '.repeat(tabWidth)
      return res
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
          if (!prettierEnabled(document, context)) {
            return
          }

          const uri = URI.parse(document.uri)
          const decoded = context.decodeEmbeddedDocumentUri(uri)
          if (!decoded) {
            return
          }
          const [documentUri, embeddedCodeId] = decoded
          // 在真正调用底层 prettier 前，记录当前源文件路径，供就近解析 prettier 使用
          lastFormatFilePath = documentUri.fsPath

          const res = await baseInstance.provideDocumentFormattingEdits?.(
            document,
            range,
            options,
            embeddedCodeContext,
            token,
          )

          if (res?.[0]?.newText) {
            let newText = res?.[0]?.newText
            if (
              embeddedCodeId === 'script_raw' ||
              embeddedCodeId === 'scriptsetup_raw'
            ) {
              newText = '\n' + newText
            }
            // 获取 <script> 初始缩进配置
            const initialIndent =
              (await context.env.getConfiguration?.(
                'mpx.format.script.initialIndent',
              )) ?? false

            if (initialIndent) {
              newText = newText
                .split(/\n/)
                .map(line => (line.length > 0 ? baseIndentSpaces + line : ''))
                .join('\n')
            }
            res[0].newText = newText
          }

          return res
        },
      }
    },
  }
}
