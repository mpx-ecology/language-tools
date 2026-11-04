import type * as ts from 'typescript'
import * as fs from 'node:fs'
import * as path from 'node:path'
import * as enhancedResolve from 'enhanced-resolve'
import { createMatchPath } from 'tsconfig-paths'

export type ResolveFile = (fileName: string) => string | undefined

/** Map aliases first; use the same file/package rules as relative requests. */
export function createTsConfigPathResolver(
  compilerConfig: ts.CompilerOptions,
  resolveRequest: ResolveFile,
  trackDependency: (fileName: string, content?: boolean) => void,
) {
  const pathsBasePath =
    typeof compilerConfig.pathsBasePath === 'string'
      ? compilerConfig.pathsBasePath
      : undefined
  const configDirectory =
    typeof compilerConfig.configFilePath === 'string'
      ? path.dirname(compilerConfig.configFilePath)
      : process.cwd()
  const matcher = createMatchPath(
    compilerConfig.baseUrl ?? pathsBasePath ?? configDirectory,
    compilerConfig.paths ?? {},
  )
  return (request: string) => {
    const matched = matcher(
      request,
      fileName => {
        trackDependency(fileName, true)
        try {
          return JSON.parse(fs.readFileSync(fileName, 'utf8'))
        } catch {
          return undefined
        }
      },
      fileName => !!resolveRequest(fileName),
      [],
    )
    return matched ? resolveRequest(matched) : undefined
  }
}

/** Create a project-scoped package resolver for Mpx component extensions. */
export function createPackagePathResolver(
  resolveFile: ResolveFile,
  trackDependency: (fileName: string, content?: boolean) => void,
) {
  const resolver = enhancedResolve.create.sync({
    extensions: ['.mpx', '.js'],
    // The default enhanced-resolve filesystem caches misses for four seconds.
    // Keep our own dependency-aware cache so newly created files are visible.
    fileSystem: new Proxy(fs, {
      get(target, key) {
        const value = Reflect.get(target, key)
        if (
          ['statSync', 'readlinkSync', 'readFileSync'].includes(String(key))
        ) {
          return (...args: unknown[]) => {
            trackDependency(String(args[0]), key === 'readFileSync')
            return Reflect.apply(value, target, args)
          }
        }
        return value
      },
    }),
    plugins: [
      {
        apply(resolver) {
          resolver
            .getHook('before-file')
            .tapAsync('MpxPlatformFile', (request, context, callback) => {
              const selected = request.path && resolveFile(request.path)
              if (!selected || selected === request.path) return callback()
              resolver.doResolve(
                resolver.ensureHook('file'),
                { ...request, path: selected },
                'Mpx platform file',
                context,
                callback,
              )
            })
        },
      },
    ],
  })

  return (uri: string, baseUri: string) => {
    const baseDir =
      fs.existsSync(baseUri) && fs.statSync(baseUri).isDirectory()
        ? baseUri
        : path.dirname(baseUri)

    try {
      return resolver({}, baseDir, uri) || undefined
    } catch {
      return undefined
    }
  }
}
