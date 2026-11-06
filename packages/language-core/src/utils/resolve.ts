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
    let probedPath: string | undefined
    let probedResult: string | undefined
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
      fileName => {
        probedPath = fileName
        probedResult = resolveRequest(fileName)
        return !!probedResult
      },
      [],
    )
    if (matched)
      return matched === probedPath ? probedResult : resolveRequest(matched)
  }
}

/** Create a project-scoped package resolver for Mpx component extensions. */
export function createPackagePathResolver(
  resolveFile: ResolveFile,
  trackDependency: (fileName: string, content?: boolean) => string,
  stat: (fileName: string) => fs.Stats | undefined,
) {
  const descriptions = new Map<
    string,
    { version: string; value: Record<string, unknown> }
  >()
  const links = new Map<string, { version: string; target?: string }>()
  const missingFile = Object.assign(new Error('File not found'), {
    code: 'ENOENT',
  })
  const syncOverrides = {
    statSync(fileName: string) {
      trackDependency(fileName)
      return stat(fileName)
    },
    readlinkSync(fileName: string) {
      const version = trackDependency(fileName)
      const cached = links.get(fileName)
      if (cached?.version === version) return cached.target
      let target: string | undefined
      try {
        target = fs.readlinkSync(fileName)
      } catch (error) {
        const code = (error as NodeJS.ErrnoException).code
        if (code !== 'ENOENT' && code !== 'EINVAL') throw error
      }
      links.set(fileName, { version, target })
      return target
    },
    readJsonSync(fileName: string) {
      const version = trackDependency(fileName, true)
      if (!version) throw missingFile
      const cached = descriptions.get(fileName)
      if (cached?.version === version) return cached.value
      const value: Record<string, unknown> = JSON.parse(
        fs.readFileSync(fileName, 'utf8'),
      )
      descriptions.set(fileName, { version, value })
      return value
    },
  }
  const resolver = enhancedResolve.create.sync({
    extensions: ['.mpx', '.js'],
    // The sync resolver uses string paths and supports an optional readJsonSync.
    fileSystem: new Proxy(fs, {
      get(target, key) {
        return Object.hasOwn(syncOverrides, key)
          ? syncOverrides[key as keyof typeof syncOverrides]
          : Reflect.get(target, key)
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
    const baseDir = stat(baseUri)?.isDirectory()
      ? baseUri
      : path.dirname(baseUri)

    try {
      return resolver({}, baseDir, uri) || undefined
    } catch {
      return undefined
    }
  }
}
