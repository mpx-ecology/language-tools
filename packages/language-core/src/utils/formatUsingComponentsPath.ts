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

  const isRealFile = (filePath: string) => {
    try {
      const stats = fs.statSync(filePath, { throwIfNoEntry: false })
      return stats && stats.isFile()
    } catch {
      return false
    }
  }

  if (componentPath.startsWith('./') || componentPath.startsWith('../')) {
    const basePath = path.join(uriToFileName(uri), '..', componentPath)

    if (!componentPath.endsWith('.mpx')) {
      const filePath = basePath + '.mpx'
      if (isRealFile(filePath)) {
        formattedFilePath = filePath
      } else {
        return { error: true }
      }
    } else {
      // double check, eg: './list.mpx' -> './list.mpx.mpx'
      if (isRealFile(basePath)) {
        formattedFilePath = basePath
      } else if (isRealFile(basePath + '.mpx')) {
        formattedFilePath = basePath + '.mpx'
      } else {
        return { error: true }
      }
    }

    // 先检查原始路径是否存在
    try {
      const stats = fs.statSync(basePath)
      if (stats.isFile()) {
        formattedFilePath = basePath
      } else {
        // 路径存在但不是文件，返回错误
        return { error: true }
      }
    } catch (err) {
      // 原始路径不存在，尝试添加 .mpx 后缀再次检查
      if (!componentPath.endsWith('.mpx')) {
        const mpxPath = basePath + '.mpx'
        try {
          const stats = fs.statSync(mpxPath)
          if (stats.isFile()) {
            formattedFilePath = mpxPath
          } else {
            return { error: true }
          }
        } catch (err) {
          // 添加 .mpx 后缀的路径也不存在
          return { error: true }
        }
      } else {
        // 已有 .mpx 后缀但路径不存在
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
    console.log('---> debug 111', result)
    if (result) {
      formattedFilePath = result
    } else {
      return { error: true }
    }
  }

  return { result: formattedFilePath }
}
