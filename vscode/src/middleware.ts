import * as lsp from '@volar/vscode'
import { AttrNameCasing, TagNameCasing } from '@mpxjs/language-server/out/types'
import * as vscode from 'vscode'
import { config } from './config'
import { attrNameCasings, tagNameCasings } from './features/nameCasing'

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
          if (item.scopeUri) {
            if (item.section === 'mpx.complete.casing.tags') {
              const tagNameCasing = tagNameCasings.get(item.scopeUri)
              if (tagNameCasing === TagNameCasing.Kebab) {
                return 'kebab'
              } else if (tagNameCasing === TagNameCasing.Pascal) {
                return 'pascal'
              }
            } else if (item.section === 'mpx.complete.casing.props') {
              const attrCase = attrNameCasings.get(item.scopeUri)
              if (attrCase === AttrNameCasing.Kebab) {
                return 'kebab'
              }
              if (attrCase === AttrNameCasing.Camel) {
                return 'camel'
              }
            }
          }
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
