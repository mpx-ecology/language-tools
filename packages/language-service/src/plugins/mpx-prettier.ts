import type { TextDocument } from 'vscode-languageserver-textdocument'
import type { Options } from 'prettier'
import type { LanguageServicePlugin } from '@volar/language-service'
import { URI } from 'vscode-uri'
import { create as baseCreate } from 'volar-service-prettier'
import { formatWithBracketSpacing, prettierEnabled } from '../utils/formatter'

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
    html: {
      breakContentsFromTags: true,
    },
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
        ...(configOptions ?? {}),
        parser: getPrettierParser(document),
      }
      const tabWidth = res.tabWidth ?? 2
      baseIndentSpaces = res.useTabs ? '\t' : ' '.repeat(tabWidth)
      return res
    },
  })

  return {
    name: 'mpx-prettier',

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
          if (!(await prettierEnabled(document, context))) {
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

          const originalGetText = document.getText
          document.getText = (range?: any) => {
            const originalText = originalGetText.call(document, range)
            if (document.languageId === 'html') {
              return `<template>${originalText}</template>`
            }
            return originalText
          }

          try {
            const res = await baseInstance.provideDocumentFormattingEdits?.(
              document,
              range,
              options,
              embeddedCodeContext,
              token,
            )

            if (res?.[0]?.newText) {
              let newText = res?.[0]?.newText

              if (isScriptBlock(embeddedCodeId)) {
                newText = '\n' + newText
              } else if (isTemplateBlock(embeddedCodeId)) {
                // 去掉首 `<template>` 和尾 `</template>/n`
                // TODO 根据 tabWidth 还原缩进
                const len = '<template>'.length
                newText = newText.slice(len, -len - 2)
              }

              // 获取 <script>/<template> 初始缩进配置
              const initialIndent =
                (isScriptBlock(embeddedCodeId) &&
                  ((await context.env.getConfiguration?.(
                    'mpx.format.script.initialIndent',
                  )) ??
                    false)) ||
                (isTemplateBlock(embeddedCodeId) &&
                  ((await context.env.getConfiguration?.(
                    'mpx.format.template.initialIndent',
                  )) ??
                    false))

              if (initialIndent) {
                newText = newText
                  .split(/\n/)
                  .map(line => (line.length > 0 ? baseIndentSpaces + line : ''))
                  .join('\n')
              }

              // format with `bracket spacing`
              newText = await formatWithBracketSpacing(context, newText)

              res[0].newText = newText
            }

            return res
          } finally {
            document.getText = originalGetText
          }
        },
      }
    },
  }
}

function isScriptBlock(embeddedCodeId: string) {
  return embeddedCodeId === 'script_raw' || embeddedCodeId === 'scriptsetup_raw'
}

function isTemplateBlock(embeddedCodeId: string) {
  return embeddedCodeId === 'template'
}

function getPrettierParser(document: TextDocument) {
  switch (document.languageId) {
    case 'html':
      return 'vue'
    case 'javascript':
    case 'typescript':
    default:
      return 'typescript'
  }
}
