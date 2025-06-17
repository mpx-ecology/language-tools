import { existsSync } from 'fs'
import path = require('path')

import { createMatchPathAsync, MatchPathAsync } from 'tsconfig-paths'
import { withResolvers } from './utils'
import { stat } from 'fs/promises'
import * as fs from 'node:fs'
import type * as ts from 'typescript'

function createTsAliasMatcher(compilerConfig: ts.CompilerOptions) {
  // const config = loadConfig(uri);
  // if (config.resultType === "failed") return;
  return createMatchPathAsync(
    compilerConfig.baseUrl ?? path.join(process.cwd(), './'),
    compilerConfig.paths ?? {},
  )
}

const resolvedResultMap = new Map<string, string>()
let tsMatcher: MatchPathAsync | undefined

interface RequestOptions {
  extensions?: string[]
  tryIndices?: string[]
}

async function tryRequest(
  uri: string,
  matcher: MatchPathAsync,
  options: RequestOptions = {},
) {
  const { extensions = [], tryIndices = ['index'] } = options

  if (resolvedResultMap.has(uri)) {
    return resolvedResultMap.get(uri)
  }

  async function doRequest(uri: string) {
    return new Promise<string | undefined>((resolve, reject) => {
      matcher(
        uri,
        pkg => require(pkg),
        (uri, callback) => {
          callback(undefined, existsSync(uri))
        },
        [],
        async (err, result) => {
          if (err) return reject(err)
          if (!result) return resolve(undefined)

          const absolute = path.isAbsolute(result)
            ? result
            : path.resolve(process.cwd(), result)

          if (
            await stat(absolute).then(
              res => res.isDirectory(),
              () => true,
            )
          )
            return resolve(undefined)
          resolve(absolute)
        },
      )
    })
  }

  async function request(uri: string, resolve: (path: string) => void) {
    const res = await doRequest(uri).catch(() => {})

    if (res) {
      resolve(res)
      return true
    }
  }

  async function tryExtensions(
    uri: string,
    resolve: (path: string) => void,
    index?: string,
  ) {
    for (const ext of extensions) {
      const urls = [`${uri}/${index}${ext}`, `${uri}${ext}`]
      for (const url of urls) {
        if (await request(url, resolve)) return true
      }
    }
  }

  const { promise, resolve, reject } = withResolvers<string | undefined>()

  promise.then(loadedUrl => {
    if (loadedUrl) resolvedResultMap.set(uri, loadedUrl)
  })

  async function start() {
    try {
      if (await request(uri, resolve).catch(() => {})) return

      for (const tryIndex of tryIndices) {
        if (await tryExtensions(uri, resolve, tryIndex)) return
      }

      resolve(undefined)
    } catch (error) {
      reject(error)
    } finally {
      resolve(undefined)
    }
  }

  start()

  return promise
}

/**
 * 使用 tsconfig.json 中的 paths 配置解析路径
 *
 * ```json
 * {
 *   "compilerOptions": {
 *     "paths": {
 *      "@root/*": ["./src/*"]
 *     }
 *   }
 * }
 * ```
 *
 * ```ts
 * {
 *  "component1": "@root/components/component1"
 * }
 * ```
 *
 * @param uri
 * @returns
 */
export async function tryResolveByTsConfig(
  uri: string,
  compilerConfig: ts.CompilerOptions,
) {
  const matcher = (tsMatcher ??= createTsAliasMatcher(compilerConfig))

  if (!matcher) return

  return tryRequest(uri, matcher, {
    extensions: ['.mpx'],
  })
}

export function reolveAbsolutePath(componentPath: string): string {
  // 按优先级补充完整路径再尝试访问
  if (componentPath.endsWith('.mpx')) {
    if (fs.existsSync(componentPath)) {
      return componentPath
    }
  } else {
    if (fs.existsSync(componentPath + '.mpx')) {
      return componentPath + '.mpx'
    } else if (fs.existsSync(componentPath + '/index.mpx')) {
      return componentPath + '/index.mpx'
    }
  }
  return ''
}

import * as enhancedResolve from 'enhanced-resolve'

let _resolver: enhancedResolve.ResolveFunctionAsync

export async function tryResolvePackage(uri: string) {
  const { promise, resolve, reject } = withResolvers<string | undefined>()

  const resolver = (_resolver ??= enhancedResolve.create({
    extensions: ['.mpx'],
  }))

  // TODO: recursive resolve parent node_modules?
  resolver({}, path.join(process.cwd(), 'node_modules'), uri, (err, result) => {
    if (err) return reject(err)
    resolve(result || undefined)
  })

  return promise
}
