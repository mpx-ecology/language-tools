import type * as ts from 'typescript'
import * as fs from 'node:fs'
import * as path from 'node:path'
import * as enhancedResolve from 'enhanced-resolve'
import { MatchPathAsync, createMatchPathAsync } from 'tsconfig-paths'
import { withResolvers } from './utils'

function createTsAliasMatcher(compilerConfig: ts.CompilerOptions) {
  return createMatchPathAsync(
    compilerConfig.baseUrl ?? path.join(process.cwd(), './'),
    compilerConfig.paths ?? {},
  )
}

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

  async function doRequest(uri: string) {
    return new Promise<string | undefined>((resolve, reject) => {
      matcher(
        uri,
        pkg => require(pkg),
        (uri, callback) => {
          callback(undefined, fs.existsSync(uri))
        },
        [],
        async (err, result) => {
          if (err) return reject(err)
          if (!result) return resolve(undefined)

          const absolute = path.isAbsolute(result)
            ? result
            : path.resolve(process.cwd(), result)

          if (
            await fs.promises.stat(absolute).then(
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

let _resolver: enhancedResolve.ResolveFunctionAsync

export async function tryResolvePackage(uri: string, baseUri: string) {
  const { promise, resolve, reject } = withResolvers<string | undefined>()

  const resolver = (_resolver ??= enhancedResolve.create({
    extensions: ['.mpx'],
  }))

  const baseDir =
    fs.existsSync(baseUri) && fs.statSync(baseUri).isDirectory()
      ? baseUri
      : path.dirname(baseUri)

  resolver({}, baseDir, uri, (err, result) => {
    if (err) return reject(err)
    resolve(result || undefined)
  })

  return promise
}
