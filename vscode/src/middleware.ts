import * as lsp from '@volar/vscode'
import * as vscode from 'vscode'
import { config } from './config'

export const middleware: lsp.Middleware = {
  ...lsp.middleware,
  async resolveCodeAction(item, token, next) {
    if (
      item.kind?.value === 'refactor.move.newFile.dumb' &&
      config.codeActions.askNewComponentName
    ) {
      const inputName = await vscode.window.showInputBox({
        value: (item as any).data.original.data.newName,
      })
      if (!inputName) {
        return item // cancel
      }
      ;(item as any).data.original.data.newName = inputName
    }
    return await (lsp.middleware.resolveCodeAction?.(item, token, next) ??
      next(item, token))
  },
  workspace: {
    configuration(params, token, next) {
      if (
        params.items.some(
          item =>
            item.section === 'mpx.complete.casing.props' ||
            item.section === 'mpx.complete.casing.tags',
        )
      ) {
        return params.items.map(item => {
          return vscode.workspace.getConfiguration(
            item.section,
            item.scopeUri ? vscode.Uri.parse(item.scopeUri) : undefined,
          )
        })
      }
      return next(params, token)
    },
  },
}
