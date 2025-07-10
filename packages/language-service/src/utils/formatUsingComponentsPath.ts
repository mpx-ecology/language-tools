import path = require('node:path')
import { URI } from 'vscode-uri'

export const uriToFileName = (uri: string) =>
  URI.parse(uri).fsPath.replace(/\\/g, '/')

export function formatUsingComponentsPath(
  componentPath: string = '',
  uri: string,
): string | undefined {
  if (!componentPath) return

  const queryIndex = componentPath.indexOf('?')
  if (queryIndex !== -1) {
    componentPath = componentPath.substring(0, queryIndex)
  }

  let formattedFilePath = ''

  if (!componentPath.endsWith('.mpx')) {
    componentPath += '.mpx'
  }

  if (componentPath.startsWith('./') || componentPath.startsWith('../')) {
    formattedFilePath = path.join(uriToFileName(uri), '..', componentPath)
  } else {
    // TODO : handle absolute paths
    return
  }

  return formattedFilePath
}
