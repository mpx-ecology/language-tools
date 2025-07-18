import type * as ts from 'typescript'
import * as fs from 'node:fs'
import * as path from 'node:path'
import { URI } from 'vscode-uri'
import { findResult } from './utils'
import { tryResolveByTsConfig, tryResolvePackage } from './resolve'

export const uriToFileName = (uri: string) =>
  URI.parse(uri).fsPath.replace(/\\/g, '/')

// TODO
// 目前仅支持自动寻找补全 .mpx 后缀路径
// .ios.mpx 和 .ali.mpx 这种条件编译后缀，暂时不支持，因为需要根据编译时环境变量来判断
export async function formatUsingComponentsPath(
  componentPath: string = '',
  uri: string,
  compilerOption: ts.CompilerOptions,
) {
  if (!componentPath) return

  const queryIndex = componentPath.indexOf('?')
  if (queryIndex !== -1) {
    componentPath = componentPath.substring(0, queryIndex)
  }

  let formattedFilePath = ''

  const isRealFile = (filePath: string, checkDir = false) => {
    try {
      const stats = fs.statSync(filePath, { throwIfNoEntry: false })
      if (checkDir) {
        return stats?.isDirectory()
      }
      return stats?.isFile()
    } catch {
      return false
    }
  }

  if (componentPath.startsWith('./') || componentPath.startsWith('../')) {
    const basePath = path.join(uriToFileName(uri), '..', componentPath)

    if (!componentPath.endsWith('.mpx')) {
      let filePath = basePath + '.mpx'
      if (isRealFile(basePath, true)) {
        // 如果是文件夹，则默认寻找目录下的 /index.mpx
        filePath = path.join(basePath, 'index.mpx')
      }
      if (isRealFile(filePath)) {
        formattedFilePath = filePath
      } else {
        return { error: true }
      }
    } else {
      // double check for edge case. eg: './list.mpx' -> './list.mpx.mpx'
      if (isRealFile(basePath)) {
        formattedFilePath = basePath
      } else if (isRealFile(basePath + '.mpx')) {
        formattedFilePath = basePath + '.mpx'
      } else {
        return { error: true }
      }
    }
  } else {
    const result = await findResult(
      [
        () => tryResolveByTsConfig(componentPath, compilerOption),
        () => tryResolvePackage(componentPath),
      ],
      fn => fn(),
    )
    if (result) {
      formattedFilePath = result
    } else {
      return { error: true }
    }
  }

  return { result: formattedFilePath }
}
