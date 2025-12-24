import { MpxVirtualCode } from '@mpxjs/language-core'
import { hitAnyAlias, isMpPluginComponentPath } from '../utils'
import type {
  CompletionItem,
  CompletionList,
  LanguageServicePlugin,
} from '@volar/language-service'
import * as vscode from 'vscode-languageserver-protocol'
import { URI } from 'vscode-uri'
import * as path from 'path'
import * as fs from 'fs'

export function create(): LanguageServicePlugin {
  return {
    name: 'mpx-json-links',

    capabilities: {
      documentLinkProvider: {},
      diagnosticProvider: {
        interFileDependencies: false,
        workspaceDiagnostics: false,
      },
      completionProvider: {
        triggerCharacters: ['/', '.', '"', "'", '@'],
      },
    },

    create(context) {
      const compilerConfig = context.project.ts?.compilerOptions || {}
      return {
        async provideDocumentLinks(document) {
          const uri = URI.parse(document.uri)
          const decoded = context.decodeEmbeddedDocumentUri(uri)
          if (!decoded) {
            return
          }
          const [documentUri, embeddedCodeId] = decoded
          if (!/json_(js|json)/.test(embeddedCodeId)) {
            return
          }
          const sourceScript = context.language.scripts.get(documentUri)
          const root = sourceScript?.generated?.root
          if (!(root instanceof MpxVirtualCode) || !root.sfc.json) {
            return
          }

          const result: vscode.DocumentLink[] = []
          const { result: resolvedUsingComponents } =
            (await root.sfc.json.resolvedUsingComponents) || {}
          const { result: resolvedPages } =
            (await root.sfc.json.resolvedPages) || {}

          if (resolvedUsingComponents?.size) {
            for (const [_, componentsArray] of resolvedUsingComponents) {
              for (const {
                text: componentPath,
                offset: componentPathOffset,
                realFilename: targetFilePath,
              } of componentsArray) {
                if (!targetFilePath) {
                  continue
                }
                if (isMpPluginComponentPath(componentPath)) {
                  // Fix #70 plugin 组件路径不处理
                  continue
                }
                result.push({
                  range: {
                    start: document.positionAt(componentPathOffset),
                    end: document.positionAt(
                      componentPathOffset + componentPath.length,
                    ),
                  },
                  // fix: 兼容 Windows 路径协议 eg: file:///d:/{you_path}/list.mpx
                  target: URI.file(targetFilePath).toString(),
                  tooltip: `自定义组件：${componentPath}`,
                })
              }
            }
          }

          if (resolvedPages?.length) {
            for (const page of resolvedPages) {
              const {
                text: pagePath,
                offset: pagePathOffset,
                realFilename: targetFilePath,
              } = page
              if (!targetFilePath) {
                continue
              }
              result.push({
                range: {
                  start: document.positionAt(pagePathOffset),
                  end: document.positionAt(pagePathOffset + pagePath.length),
                },
                target: URI.file(targetFilePath).toString(),
                tooltip: `页面路径：${pagePath}`,
              })
            }
          }

          return result
        },

        async provideDiagnostics(document) {
          const uri = URI.parse(document.uri)
          const decoded = context.decodeEmbeddedDocumentUri(uri)
          if (!decoded) {
            return
          }
          const [documentUri, embeddedCodeId] = decoded
          if (!/json_(js|json)/.test(embeddedCodeId)) {
            return
          }
          const sourceScript = context.language.scripts.get(documentUri)
          const root = sourceScript?.generated?.root
          if (!(root instanceof MpxVirtualCode) || !root.sfc.json) {
            return
          }

          const diagnostics: vscode.Diagnostic[] = []

          const { errors: resolvedUsingComponentsErrors = [] } =
            (await root.sfc.json.resolvedUsingComponents) || {}
          const { errors: resolvedPagesErrors = [] } =
            (await root.sfc.json.resolvedPages) || {}

          if (
            !resolvedUsingComponentsErrors?.length &&
            !resolvedPagesErrors?.length
          ) {
            return []
          }

          // 收集路径错误
          for (const { text, offset } of [
            ...resolvedUsingComponentsErrors,
            ...resolvedPagesErrors,
          ]) {
            diagnostics.push({
              range: {
                start: document.positionAt(offset),
                end: document.positionAt(offset + text.length),
              },
              severity: 1 satisfies typeof vscode.DiagnosticSeverity.Error,
              code: '4001',
              source: 'mpx-json',
              message: `找不到对应路径文件：'${text}'，请检查文件路径是否正确。`,
            })
          }

          return diagnostics
        },

        async provideCompletionItems(
          document,
          position,
          _completionContext,
          _token,
        ) {
          // 检查是否在正确的文档类型中
          const uri = URI.parse(document.uri)
          const decoded = context.decodeEmbeddedDocumentUri(uri)

          if (!decoded) return

          const [documentUri, embeddedCodeId] = decoded
          // 只在 json_js 类型中提供补全
          if (embeddedCodeId !== 'json_js') return

          // 获取当前行文本
          const line = document.getText({
            start: { line: position.line, character: 0 },
            end: position,
          })

          // 检查是否在字符串中（简单判断是否有未闭合的引号）
          console.log(line.match(/['"]/g))
          const quoteCount = (line.match(/['"]/g) || []).length
          if (quoteCount % 2 === 0) {
            // 不在字符串中，不提供路径补全
            return
          }

          // 获取触发补全的路径前缀
          const prefixMatch = line.match(/(['"])([^'"]*)$/)
          const prefix = prefixMatch?.[2] || ''

          // 获取当前文件的目录作为基础路径
          const currentFilePath = documentUri.fsPath
          const basePath = path.dirname(currentFilePath)
          // 生成补全项
          const completions: CompletionItem[] = []

          const { alias } =
            hitAnyAlias(prefix, compilerConfig.paths || {}) || {}
          // 如果是相对路径或别名路径
          if (prefix.startsWith('./') || prefix.startsWith('../') || alias) {
            // 需要的相关路径
            let findPath = path.resolve(basePath, prefix)
            if (alias) {
              // 处理别名路径，这里简化处理，实际项目中可能需要读取 tsconfig.json 中的 paths 配置
              findPath =
                compilerConfig.paths?.[alias]?.[0]?.replace('*', '') || ''
            }

            // 读取目录内容
            if (
              fs.existsSync(findPath) &&
              fs.statSync(findPath)?.isDirectory()
            ) {
              try {
                const entries = fs.readdirSync(findPath)

                for (const entry of entries) {
                  const entryPath = path.join(findPath, entry)
                  if (entryPath === currentFilePath) continue
                  const stat = fs.statSync(entryPath)

                  const isDirectory = stat.isDirectory()
                  const completionLabel = entry
                  const completionInsertText = entry

                  completions.push({
                    label: completionLabel,
                    insertText: completionInsertText,
                    kind: isDirectory
                      ? vscode.CompletionItemKind.Folder
                      : vscode.CompletionItemKind.File,
                  })
                }
              } catch (err) {
                // 读取目录失败，忽略错误
                console.error('Failed to read directory:', err)
              }
            }
          }

          return {
            isIncomplete: false,
            items: completions,
          } satisfies CompletionList
        },
      }
    },
  }
}
