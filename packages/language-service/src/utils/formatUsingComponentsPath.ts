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

  // 目前仅支持自动寻找补全 .mpx 后缀路径
  // .ios.mpx 和 .ali.mpx 这种条件编译后缀，暂时不支持，因为需要根据编译时环境变量来判断
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
