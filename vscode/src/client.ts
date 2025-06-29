import * as fs from 'node:fs'
import * as vscode from 'vscode'
import {
  defineExtension,
  executeCommand,
  extensionContext,
  onDeactivate,
} from 'reactive-vscode'
import * as lsp from '@volar/vscode/node'
import { createLabsInfo } from '@volar/vscode'
import * as protocol from '@mpxjs/language-server/out/protocol'
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
          `启用 ${displayName} 新版本插件后，历史插件 "${legacyExtension.packageJSON.displayName}" 将逐步废弃，请前往卸载以避免潜在冲突。`,
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

  activateLanguageClient(
    context,
    (id, name, documentSelector, initOptions, port, outputChannel) => {
      class _LanguageClient extends lsp.LanguageClient {
        fillInitializeParams(params: lsp.InitializeParams) {
          params.locale = vscode.env.language
        }
      }

      const serverModule = vscode.Uri.joinPath(
        context.extensionUri,
        'server.js',
      )

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
        initializationOptions: initOptions,
        markdown: {
          isTrusted: true,
          supportHtml: true,
        },
        outputChannel,
      }
      const client = new _LanguageClient(id, name, serverOptions, clientOptions)
      client.start()

      volarLabs.addLanguageClient(client)

      updateProviders(client)

      /**
       * Proxy command request from mpx-lsp-server to builtin tsserver
       */

      client.onRequest('tsserverRequest', async ([command, args]) => {
        const tsserver = (globalThis as any).__TSSERVER__?.semantic
        if (!tsserver) {
          return
        }
        try {
          const res = await tsserver.executeImpl(command, args, {
            isAsync: true,
            expectsResult: true,
            lowPriority: true,
            requireSemantic: true,
          })[0]
          return res.body
        } catch {
          // noop
        }
      })

      return client
    },
  )

  onDeactivate(() => {
    deactivateLanguageClient()
  })

  return volarLabs.extensionExports
})

function updateProviders(client: lsp.LanguageClient) {
  const initializeFeatures = (client as any).initializeFeatures

  ;(client as any).initializeFeatures = (...args: any) => {
    const capabilities = (client as any)._capabilities as lsp.ServerCapabilities

    if (!config.codeActions.enabled) {
      capabilities.codeActionProvider = undefined
    }
    if (!config.codeLens.enabled) {
      capabilities.codeLensProvider = undefined
    }

    return initializeFeatures.call(client, ...args)
  }
}

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
       * Expose tsserver process in SingleTsServer constructor
       */

      text = text.replace(
        ',this._callbacks.destroy("server errored")}))',
        s =>
          s +
          ',globalThis.__TSSERVER__||={},globalThis.__TSSERVER__[arguments[1]]=this',
      )

      /**
       * support for VS Code < 1.87.0
       */

      // patch jsTsLanguageModes
      text = text.replace(
        't.$u=[t.$r,t.$s,t.$p,t.$q]',
        s => s + '.concat("mpx")',
      )
      // patch isSupportedLanguageMode
      text = text.replace(
        '.languages.match([t.$p,t.$q,t.$r,t.$s]',
        s => s + '.concat("mpx")',
      )

      /**
       * support for VS Code >= 1.87.0
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
