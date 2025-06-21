import * as lsp from '@volar/vscode'
import type { MpxInitializationOptions } from '@mpxjs/language-server'
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
  initOptions: MpxInitializationOptions,
  port: number,
  outputChannel: vscode.OutputChannel,
) => lsp.BaseLanguageClient

export function activate(
  context: vscode.ExtensionContext,
  createLc: CreateLanguageClient,
) {
  const activeTextEditor = useActiveTextEditor()
  const visibleTextEditors = useVisibleTextEditors()

  const { stop } = watch(
    activeTextEditor,
    () => {
      if (
        visibleTextEditors.value.some(editor =>
          config.server.includeLanguages.includes(editor.document.languageId),
        )
      ) {
        activateLc(context, createLc)
        nextTick(() => {
          stop()
        })
      }
    },
    {
      immediate: true,
    },
  )
}

export function deactivate() {
  return client?.stop()
}

async function activateLc(
  context: vscode.ExtensionContext,
  createLc: CreateLanguageClient,
) {
  useVscodeContext('mpx.activated', true)
  const outputChannel = useOutputChannel('Mpx Language Server')
  const selectors = config.server.includeLanguages

  client = createLc(
    'mpx-language-server',
    'Mpx Language Server',
    selectors,
    await getInitializationOptions(context),
    6019,
    outputChannel,
  )

  watch(
    () => config.server.includeLanguages,
    () => {
      requestRestartExtensionHost(
        'Please restart extension host to apply the new language settings.',
      )
    },
  )

  useCommand(
    'mpx.action.restartServer',
    async (restartTsServer: boolean = true) => {
      if (restartTsServer) {
        await executeCommand('typescript.restartTsServer')
      }
      await client.stop()
      outputChannel.clear()
      client.clientOptions.initializationOptions =
        await getInitializationOptions(context)
      await client.start()
    },
  )

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

async function getInitializationOptions(
  context: vscode.ExtensionContext,
): Promise<MpxInitializationOptions> {
  return {
    typescript: {
      tsdk: (await lsp.getTsdk(context))!.tsdk,
      tsserverRequestCommand: 'tsserverRequest',
    },
  }
}
