import type * as ts from 'typescript'
import * as path from 'node:path'
import { URI } from 'vscode-uri'
import { findResult } from './utils'
import { tryResolveByTsConfig, tryResolvePackage } from './resolve'

export const uriToFileName = (uri: string) =>
  URI.parse(uri).fsPath.replace(/\\/g, '/')

// TODO .ios.mpx,.ali.mpx 条件编译后缀暂时不支持，需要编译时 mode 判断
export async function formatUsingComponentsPath(
  componentPath: string = '',
  uri: string,
  compilerOption: ts.CompilerOptions,
) {
  if (!componentPath) {
    return
  }

  const queryIndex = componentPath.indexOf('?')
  if (queryIndex !== -1) {
    componentPath = componentPath.substring(0, queryIndex)
  }

  if (componentPath.startsWith('./') || componentPath.startsWith('../')) {
    // Windows: path.resolve 可以保留磁盘符
    componentPath = path.resolve(uriToFileName(uri), '..', componentPath)
  }

  const result = await findResult(
    [
      () => tryResolveByTsConfig(componentPath, compilerOption),
      () => tryResolvePackage(componentPath, uri),
    ],
    fn => fn(),
  )
  if (result) {
    return { result }
  }
  return { error: true }
}
