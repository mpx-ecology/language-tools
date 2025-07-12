import * as fs from 'node:fs'
import * as path from 'node:path'
import * as vscode from 'vscode'
import * as lsp from '@volar/vscode/node'
import * as protocol from '@mpxjs/language-server/out/protocol'
import {
  defineExtension,
  executeCommand,
  extensionContext,
  onDeactivate,
} from 'reactive-vscode'
import { createLabsInfo } from '@volar/vscode'
import { config, displayName } from './config'
import {
  activate as activateLanguageClient,
  deactivate as deactivateLanguageClient,
} from './languageClient'

export const { activate, deactivate } = defineExtension(async () => {
  const volarLabs = createLabsInfo(protocol)

  // Required plugins
  const tsExtension = vscode.extensions.getExtension(
    'vscode.typescript-language-features',
  )

  if (tsExtension) {
    await tsExtension.activate()
  } else {
    vscode.window
      .showWarningMessage(
        `为了 ${displayName} 插件能正常运行，请先启用 VSCode 内置插件 "TypeScript and JavaScript Language Features"`,
        '启用',
      )
      .then(selected => {
        if (selected) {
          executeCommand(
            'workbench.extensions.search',
            '@builtin typescript-language-features',
          )
        }
      })
  }

  // Legacy plugins
  const legacyExtensions = [
    vscode.extensions.getExtension('pagnkelly.mpx'),
    vscode.extensions.getExtension('wangshun.mpx-template-features'),
  ]

  legacyExtensions.forEach(legacyExtension => {
    if (legacyExtension) {
      vscode.window
        .showWarningMessage(
          `启用 ${displayName} 新版官方插件后，历史插件 "${legacyExtension.packageJSON.displayName}" 将逐步废弃，请前往卸载以避免潜在冲突。`,
          '前往卸载',
        )
        .then(selected => {
          if (selected) {
            executeCommand('workbench.extensions.search', legacyExtension.id)
          }
        })
    }
  })

  const context = extensionContext.value!

  activateLanguageClient((id, name, documentSelector, port, outputChannel) => {
    class _LanguageClient extends lsp.LanguageClient {
      fillInitializeParams(params: lsp.InitializeParams) {
        params.locale = vscode.env.language
      }
    }

    // Setup typescript.js in production mode
    if (fs.existsSync(path.join(__dirname, 'server.js'))) {
      fs.writeFileSync(
        path.join(__dirname, 'typescript.js'),
        `module.exports = require("${vscode.env.appRoot.replace(
          /\\/g,
          '/',
        )}/extensions/node_modules/typescript/lib/typescript.js");`,
      )
    }

    const serverModule = vscode.Uri.joinPath(context.extensionUri, 'server.js')
    const serverOptions: lsp.ServerOptions = {
      run: {
        module: serverModule.fsPath,
        transport: lsp.TransportKind.ipc,
        options: {},
      },
      debug: {
        module: serverModule.fsPath,
        transport: lsp.TransportKind.ipc,
        options: { execArgv: ['--nolazy', '--inspect=' + port] },
      },
    }
    const clientOptions: lsp.LanguageClientOptions = {
      documentSelector: documentSelector,
      markdown: {
        isTrusted: true,
        supportHtml: true,
      },
      outputChannel,
    }
    const client = new _LanguageClient(id, name, serverOptions, clientOptions)

    /**
     * Proxy command request from mpx-lsp-server to builtin tsserver
     */

    client.onNotification('tsserver/request', async ([seq, command, args]) => {
      const res = await vscode.commands.executeCommand<
        { body: unknown } | undefined
      >('typescript.tsserverRequest', command, args, {
        isAsync: true,
        lowPriority: true,
      })
      client.sendNotification('tsserver/response', [seq, res?.body])
    })

    client.start()
    volarLabs.addLanguageClient(client)
    return client
  })

  onDeactivate(() => {
    deactivateLanguageClient()
  })

  return volarLabs.extensionExports
})

try {
  const tsExtension = vscode.extensions.getExtension(
    'vscode.typescript-language-features',
  )!
  const readFileSync = fs.readFileSync
  const extensionJsPath = require.resolve('./dist/extension.js', {
    paths: [tsExtension.extensionPath],
  })

  // @ts-expect-error ignore
  fs.readFileSync = (...args) => {
    if (args[0] === extensionJsPath) {
      // @ts-expect-error ignore
      let text = readFileSync(...args) as string

      /**
       *  Compatible with or without the installation of `vue-plugin`
       */

      text = text.replace(
        'Array.isArray(e.languages)',
        [
          `e.name==='mpx-typescript-plugin-pack'?[${config.server.includeLanguages
            .map(lang => `'${lang}'`)
            .join(',')}]`,
          ':Array.isArray(e.languages)',
        ].join(''),
      )

      /**
       * Only support for VS Code >= 1.87.0
       */

      // patch jsTsLanguageModes
      text = text.replace(
        't.jsTsLanguageModes=[t.javascript,t.javascriptreact,t.typescript,t.typescriptreact]',
        s => s + '.concat("mpx")',
      )
      // patch isSupportedLanguageMode
      text = text.replace(
        '.languages.match([t.typescript,t.typescriptreact,t.javascript,t.javascriptreact]',
        s => s + '.concat("mpx")',
      )

      return text
    }
    // @ts-expect-error ignore
    return readFileSync(...args)
  }

  // Hot reload tsserver
  const loadedModule = require.cache[extensionJsPath]
  if (loadedModule) {
    delete require.cache[extensionJsPath]
    const patchedModule = require(extensionJsPath)
    Object.assign(loadedModule.exports, patchedModule)
  }

  if (tsExtension.isActive) {
    vscode.commands.executeCommand('workbench.action.restartExtensionHost')
  }
} catch {
  // noop
}
