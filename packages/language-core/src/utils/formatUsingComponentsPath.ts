import type * as ts from 'typescript'
import * as path from 'node:path'
import { URI } from 'vscode-uri'
import {
  createPackagePathResolver,
  createTsConfigPathResolver,
} from './resolve'

export const uriToFileName = (uri: string) =>
  URI.parse(uri).fsPath.replace(/\\/g, '/')

/**
 * Create one synchronous resolver per TypeScript project. Both JSON navigation
 * and virtual TypeScript imports use the result, so they follow identical Mpx
 * extension and directory-index rules.
 */
export function createUsingComponentsPathResolver(
  compilerOptions: ts.CompilerOptions,
) {
  const resolveByTsConfig = createTsConfigPathResolver(compilerOptions)
  const resolvePackage = createPackagePathResolver()

  // TODO .ios.mpx,.ali.mpx 条件编译后缀暂时不支持，需要编译时 mode 判断
  return function resolveUsingComponentsPath(
    componentPath: string = '',
    uri: string,
  ) {
    if (!componentPath) {
      return
    }

    const queryIndex = componentPath.indexOf('?')
    if (queryIndex !== -1) {
      componentPath = componentPath.substring(0, queryIndex)
    }

    if (componentPath.startsWith('./') || componentPath.startsWith('../')) {
      // Windows: path.resolve can preserve the drive letter.
      componentPath = path.resolve(uriToFileName(uri), '..', componentPath)
    }

    // Fix #70: plugin components do not have a local source file.
    if (componentPath.startsWith('plugin://')) {
      return { result: componentPath }
    }

    const result =
      resolveByTsConfig(componentPath) || resolvePackage(componentPath, uri)

    return result ? { result } : { error: true }
  }
}
