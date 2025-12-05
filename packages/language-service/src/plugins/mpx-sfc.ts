import type * as vscode from 'vscode-languageserver-protocol'
import type { TextDocument } from 'vscode-languageserver-textdocument'
import type {
  LanguageServiceContext,
  LanguageServicePlugin,
} from '@volar/language-service'
import * as html from 'vscode-html-languageservice'
import { create as createHtmlService } from 'volar-service-html'
import { URI } from 'vscode-uri'
import { MpxVirtualCode } from '@mpxjs/language-core'
import sfcBlocksData from '../data/sfcBlocks'
import { scriptSnippets } from '../utils/snippets'

let sfcDataProvider: html.IHTMLDataProvider | undefined

export function create(): LanguageServicePlugin {
  const htmlService = createHtmlService({
    documentSelector: ['mpx-root-tags'],

    useDefaultDataProvider: false,

    getCustomData() {
      sfcDataProvider ??= html.newHTMLDataProvider('mpx', sfcBlocksData)
      return [sfcDataProvider]
    },

    async getFormattingOptions(document, options, context) {
      return (
        (await worker(document, context, async root => {
          const formatSettings =
            (await context.env.getConfiguration?.<html.HTMLFormatConfiguration>(
              'html.format',
            )) ?? {}
          const blockTypes = ['template', 'script', 'style']

          for (const customBlock of root.sfc.customBlocks) {
            blockTypes.push(customBlock.type)
          }

          return {
            ...options,
            ...formatSettings,
            wrapAttributes: 'auto',
            unformatted: '',
            contentUnformatted: blockTypes.join(','),
            endWithNewline: options.insertFinalNewline
              ? true
              : options.trimFinalNewlines
                ? false
                : document.getText().endsWith('\n'),
          }
        })) ?? {}
      )
    },
  })

  return {
    ...htmlService,

    name: 'mpx-sfc',

    capabilities: {
      ...htmlService.capabilities,
      diagnosticProvider: {
        interFileDependencies: false,
        workspaceDiagnostics: false,
      },
    },

    create(context) {
      const htmlServiceInstance = htmlService.create(context)

      return {
        ...htmlServiceInstance,

        provideDocumentLinks: undefined,

        async resolveEmbeddedCodeFormattingOptions(
          sourceScript,
          virtualCode,
          options,
        ) {
          if (sourceScript.generated?.root instanceof MpxVirtualCode) {
            if (
              virtualCode.id === 'script_raw' ||
              virtualCode.id === 'scriptsetup_raw'
            ) {
              if (
                (await context.env.getConfiguration?.(
                  'mpx.format.script.initialIndent',
                )) ??
                false
              ) {
                options.initialIndentLevel++
              }
            } else if (virtualCode.id === 'json_js') {
              if (
                (await context.env.getConfiguration?.(
                  'mpx.format.script.initialIndent',
                )) ??
                false
              ) {
                options.initialIndentLevel = 1
              } else {
                options.initialIndentLevel = 0
              }
            } else if (virtualCode.id.startsWith('style_')) {
              if (
                (await context.env.getConfiguration?.(
                  'mpx.format.style.initialIndent',
                )) ??
                false
              ) {
                options.initialIndentLevel++
              }
            } else if (virtualCode.id === 'template') {
              if (
                (await context.env.getConfiguration?.(
                  'mpx.format.template.initialIndent',
                )) ??
                true
              ) {
                options.initialIndentLevel++
              }
            }
          }
          return options
        },

        provideDiagnostics(document, token) {
          return worker(document, context, async root => {
            const { mpxSfc, sfc } = root
            if (!mpxSfc) {
              return
            }

            const originalResult =
              await htmlServiceInstance.provideDiagnostics?.(document, token)
            const sfcErrors: vscode.Diagnostic[] = []
            const { template } = sfc

            const { startTagEnd = Infinity, endTagStart = -Infinity } =
              template ?? {}

            for (const error of mpxSfc.errors) {
              if ('code' in error) {
                const start = error.loc?.start.offset ?? 0
                const end = error.loc?.end.offset ?? 0
                if (start > startTagEnd || end <= endTagStart) {
                  sfcErrors.push({
                    range: {
                      start: document.positionAt(start),
                      end: document.positionAt(end),
                    },
                    severity:
                      1 satisfies typeof vscode.DiagnosticSeverity.Error,
                    code: error.code,
                    source: 'mpx',
                    message: error.message,
                  })
                }
              }
            }

            return [...(originalResult ?? []), ...sfcErrors]
          })
        },

        provideDocumentSymbols(document) {
          return worker(document, context, root => {
            const result: vscode.DocumentSymbol[] = []
            const { sfc } = root

            if (sfc.template) {
              result.push({
                name: 'template',
                kind: 2 satisfies typeof vscode.SymbolKind.Module,
                range: {
                  start: document.positionAt(sfc.template.start),
                  end: document.positionAt(sfc.template.end),
                },
                selectionRange: {
                  start: document.positionAt(sfc.template.start),
                  end: document.positionAt(sfc.template.startTagEnd),
                },
              })
            }
            if (sfc.script) {
              result.push({
                name: 'script',
                kind: 2 satisfies typeof vscode.SymbolKind.Module,
                range: {
                  start: document.positionAt(sfc.script.start),
                  end: document.positionAt(sfc.script.end),
                },
                selectionRange: {
                  start: document.positionAt(sfc.script.start),
                  end: document.positionAt(sfc.script.startTagEnd),
                },
              })
            }
            if (sfc.scriptSetup) {
              if (sfc.scriptSetup.start !== sfc.scriptSetup.end) {
                result.push({
                  name: 'script setup',
                  kind: 2 satisfies typeof vscode.SymbolKind.Module,
                  range: {
                    start: document.positionAt(sfc.scriptSetup.start),
                    end: document.positionAt(sfc.scriptSetup.end),
                  },
                  selectionRange: {
                    start: document.positionAt(sfc.scriptSetup.start),
                    end: document.positionAt(sfc.scriptSetup.startTagEnd),
                  },
                })
              }
            }
            if (sfc.json) {
              result.push({
                name: 'script json',
                kind: 2 satisfies typeof vscode.SymbolKind.Module,
                range: {
                  start: document.positionAt(sfc.json.start),
                  end: document.positionAt(sfc.json.end),
                },
                selectionRange: {
                  start: document.positionAt(sfc.json.start),
                  end: document.positionAt(sfc.json.startTagEnd),
                },
              })
            }
            for (const style of sfc.styles) {
              let name = 'style'
              if (style.scoped) {
                name += ' scoped'
              }
              if (style.module) {
                name += ' module'
              }
              result.push({
                name,
                kind: 2 satisfies typeof vscode.SymbolKind.Module,
                range: {
                  start: document.positionAt(style.start),
                  end: document.positionAt(style.end),
                },
                selectionRange: {
                  start: document.positionAt(style.start),
                  end: document.positionAt(style.startTagEnd),
                },
              })
            }
            for (const customBlock of sfc.customBlocks) {
              result.push({
                name: `${customBlock.type}`,
                kind: 2 satisfies typeof vscode.SymbolKind.Module,
                range: {
                  start: document.positionAt(customBlock.start),
                  end: document.positionAt(customBlock.end),
                },
                selectionRange: {
                  start: document.positionAt(customBlock.start),
                  end: document.positionAt(customBlock.startTagEnd),
                },
              })
            }

            return result
          })
        },

        async provideCompletionItems(document, position, context, token) {
          const result = await htmlServiceInstance.provideCompletionItems?.(
            document,
            position,
            context,
            token,
          )
          if (!result) {
            return
          }

          const tags = sfcDataProvider?.provideTags()

          const scriptItems = result.items.filter(
            item => item.label === 'script' || item.label === 'script setup',
          )

          for (const scriptItem of scriptItems) {
            scriptItem.kind = 17 satisfies typeof vscode.CompletionItemKind.File
            const scriptLabel = scriptItem.label
            const snippetsCode =
              scriptSnippets[
                scriptLabel === 'script' ? 'optionsAPI' : 'compositionAPI'
              ]
            for (const [prefixText, lang] of [
              [scriptLabel, '.js'],
              [scriptLabel + ' lang="ts"', '.ts'],
            ]) {
              for (const { label, code, description = '' } of snippetsCode) {
                const newText = `${prefixText}>\n${code}\n</script>`
                result.items.push({
                  detail: lang,
                  insertTextFormat:
                    2 satisfies typeof vscode.InsertTextFormat.Snippet,
                  kind: 17 satisfies typeof vscode.CompletionItemKind.File,
                  label: `${prefixText}${label ? ' | ' + label : ''}`,
                  textEdit: scriptItem.textEdit
                    ? {
                        ...scriptItem.textEdit,
                        newText,
                      }
                    : undefined,
                  documentation: {
                    kind: 'markdown',
                    value:
                      '- ' + description + '\n```ts\n\<' + newText + '\n```',
                  },
                })
              }
            }
          }

          const jsonItems = result.items.filter(
            item =>
              item.label === 'script name="json"' ||
              item.label === 'script type="application/json"',
          )

          for (const item of jsonItems) {
            const isJsonJs = item.label === 'script name="json"'
            const snippetsCode =
              scriptSnippets[isJsonJs ? 'jsonJs' : 'jsonJson']
            for (const { label, code, description = '' } of snippetsCode) {
              const newText = `${item.label}>\n${code}\n</script>`
              item.kind = 17 satisfies typeof vscode.CompletionItemKind.File
              item.insertTextFormat =
                2 satisfies typeof vscode.InsertTextFormat.Snippet
              item.detail = isJsonJs ? '.js' : '.json'
              item.label = `json | ${item.label}${label ? ' | ' + label : ''}`
              item.textEdit = item.textEdit
                ? {
                    ...item.textEdit,
                    newText,
                  }
                : undefined
              item.documentation = {
                kind: 'markdown',
                value: '- ' + description + '\n```ts\n\<' + newText + '\n```',
              }
            }
          }

          const styleLangs = getLangs('style')
          const styleItem = result.items.find(item => item.label === 'style')
          if (styleItem) {
            styleItem.kind = 17 satisfies typeof vscode.CompletionItemKind.File
            styleItem.detail = '.css'
            for (const lang of styleLangs) {
              result.items.push(
                getStyleCompletionItem(styleItem, lang),
                getStyleCompletionItem(styleItem, lang, 'scoped'),
                // getStyleCompletionItem(styleItem, lang, 'module'),
              )
            }
          }

          result.items = result.items.filter(
            item =>
              (item.label !== '!DOCTYPE' &&
                item.label !== 'Custom Blocks' &&
                item.label !== 'data-' &&
                item.label !== 'script' &&
                item.label !== 'script setup' &&
                item.label !== 'style') ||
              (item.label === 'script setup' && item.insertTextFormat === 2),
          )

          return result

          function getLangs(label: string) {
            return (
              tags
                ?.find(tag => tag.name === label)
                ?.attributes.find(attr => attr.name === 'lang')
                ?.values?.map(({ name }) => name) ?? []
            )
          }
        },
      }
    },
  }

  function worker<T>(
    document: TextDocument,
    context: LanguageServiceContext,
    callback: (root: MpxVirtualCode) => T,
  ) {
    if (document.languageId !== 'mpx-root-tags') {
      return
    }
    const uri = URI.parse(document.uri)
    const decoded = context.decodeEmbeddedDocumentUri(uri)
    const sourceScript = decoded && context.language.scripts.get(decoded[0])
    const root = sourceScript?.generated?.root
    if (root instanceof MpxVirtualCode) {
      return callback(root)
    }
  }
}

function getStyleCompletionItem(
  styleItem: vscode.CompletionItem,
  lang: string,
  attr?: string,
): vscode.CompletionItem {
  return {
    ...styleItem,
    insertTextFormat: 2 satisfies typeof vscode.InsertTextFormat.Snippet,
    kind: 17 satisfies typeof vscode.CompletionItemKind.File,
    detail: lang === 'postcss' ? '.css' : `.${lang}`,
    label: styleItem.label + ' lang="' + lang + '"' + (attr ? ` ${attr}` : ''),
    textEdit: styleItem.textEdit
      ? {
          ...styleItem.textEdit,
          newText:
            styleItem.textEdit.newText +
            ' lang="' +
            lang +
            '"' +
            (attr ? ` ${attr}` : '') +
            `>\n$1\n</style>`,
        }
      : undefined,
  }
}
