import path = require('node:path')
import { URI } from 'vscode-uri'
import { findResult } from './utils'
import { tryResolveByTsConfig, tryResolvePackage } from './resolve'
import type * as ts from 'typescript'

export const uriToFileName = (uri: string) =>
  URI.parse(uri).fsPath.replace(/\\/g, '/')

export async function formatUsingComponentsPath(
  componentPath: string = '',
  uri: string,
  compilerOption: ts.CompilerOptions,
): Promise<string | undefined> {
  if (!componentPath) return

  const queryIndex = componentPath.indexOf('?')
  if (queryIndex !== -1) {
    componentPath = componentPath.substring(0, queryIndex)
  }

  let formattedFilePath = ''

  if (componentPath.startsWith('./') || componentPath.startsWith('../')) {
    // 目前仅支持自动寻找补全 .mpx 后缀路径
    // .ios.mpx 和 .ali.mpx 这种条件编译后缀，暂时不支持，因为需要根据编译时环境变量来判断
    if (!componentPath.endsWith('.mpx')) {
      componentPath += '.mpx'
    }
    formattedFilePath = path.join(uriToFileName(uri), '..', componentPath)
  } else {
    const result = await findResult(
      [
        () => tryResolveByTsConfig(componentPath, compilerOption),
        () => tryResolvePackage(componentPath),
      ],
      fn => fn(),
    )
    if (result) {
      return result
    }
  }

  return formattedFilePath
}
