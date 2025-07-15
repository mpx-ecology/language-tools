import * as lsp from '@volar/vscode'
import {
  executeCommand,
  nextTick,
  useActiveTextEditor,
  useCommand,
  useOutputChannel,
  useVisibleTextEditors,
  useVscodeContext,
  watch,
} from 'reactive-vscode'
import * as vscode from 'vscode'
import { config } from './config'
import { activate as activateSplitEditors } from './features/splitEditors'

let client: lsp.BaseLanguageClient

type CreateLanguageClient = (
  id: string,
  name: string,
  langs: lsp.DocumentSelector,
  port: number,
  outputChannel: vscode.OutputChannel,
) => lsp.BaseLanguageClient

export function activate(createLc: CreateLanguageClient) {
  const activeTextEditor = useActiveTextEditor()
  const visibleTextEditors = useVisibleTextEditors()

  const { stop } = watch(
    activeTextEditor,
    () => {
      if (
        !visibleTextEditors.value.some(editor =>
          config.server.includeLanguages.includes(editor.document.languageId),
        )
      ) {
        return
      }
      activateLc(createLc)
      nextTick(() => {
        stop()
      })
    },
    {
      immediate: true,
    },
  )
}

export function deactivate() {
  return client?.stop()
}

async function activateLc(createLc: CreateLanguageClient) {
  useVscodeContext('mpx.activated', true)
  const selectors = config.server.includeLanguages

  client = createLc('mpx', 'Mpx', selectors, 6019, useOutputChannel('Mpx'))

  watch(
    () => config.server.includeLanguages,
    () => {
      requestRestartExtensionHost(
        'Please restart extension host to apply the new language settings.',
      )
    },
  )

  useCommand('mpx.action.restartServer', async () => {
    await executeCommand('typescript.restartTsServer')
    await client.stop()
    client?.outputChannel.clear()
    await client?.start()
  })

  activateSplitEditors(client)

  lsp.activateAutoInsertion(selectors, client)
  lsp.activateDocumentDropEdit(selectors, client)

  async function requestRestartExtensionHost(msg: string) {
    const reload = await vscode.window.showInformationMessage(
      msg,
      'Restart Extension Host',
    )
    if (reload) {
      executeCommand('workbench.action.restartExtensionHost')
    }
  }
}
