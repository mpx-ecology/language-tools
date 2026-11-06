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
  const files = new Map<string, { version: string; contents: Buffer }>()
  const missingFile = Object.assign(new Error('File not found'), {
    code: 'ENOENT',
  })
  const fileSystem = {
    ...fs,
    statSync(fileName: string) {
      trackDependency(fileName)
      return stat(fileName)
    },
    readlinkSync(fileName: string) {
      trackDependency(fileName)
      return fs.readlinkSync(fileName)
    },
    readFileSync(fileName: string) {
      const version = trackDependency(fileName, true)
      if (!version) throw missingFile
      const cached = files.get(fileName)
      if (cached?.version === version) return cached.contents
      const contents = fs.readFileSync(fileName)
      files.set(fileName, { version, contents })
      return contents
    },
  }
  const resolver = enhancedResolve.create.sync({
    extensions: ['.mpx', '.js'],
    // Cache package contents against their metadata instead of using a TTL.
    fileSystem: fileSystem as typeof fs,
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
