import type * as ts from 'typescript'
import type { MatchPath } from 'tsconfig-paths'
import * as fs from 'node:fs'
import * as path from 'node:path'
import * as enhancedResolve from 'enhanced-resolve'
import { createMatchPath } from 'tsconfig-paths'

interface RequestOptions {
  extensions?: string[]
  tryIndices?: string[]
}

function tryRequest(
  uri: string,
  matcher: MatchPath,
  options: RequestOptions = {},
) {
  const { extensions = [], tryIndices = ['index'] } = options

  function request(requestUri: string) {
    let result: string | undefined
    try {
      result = matcher(
        requestUri,
        packageJsonPath => {
          try {
            return JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'))
          } catch {
            return undefined
          }
        },
        fs.existsSync,
        [],
      )
    } catch {
      return
    }

    if (!result) {
      return
    }

    const absolute = path.isAbsolute(result)
      ? result
      : path.resolve(process.cwd(), result)

    try {
      if (fs.statSync(absolute).isFile()) {
        return absolute
      }
    } catch {
      // The matcher can return a path that disappears between lookup and stat.
    }
  }

  const exactResult = request(uri)
  if (exactResult) {
    return exactResult
  }

  for (const tryIndex of tryIndices) {
    for (const ext of extensions) {
      // Keep the same lookup order as the JSON path resolver used previously.
      for (const candidate of [`${uri}/${tryIndex}${ext}`, `${uri}${ext}`]) {
        const result = request(candidate)
        if (result) {
          return result
        }
      }
    }
  }
}

/** Create a project-scoped resolver for tsconfig `baseUrl` / `paths`. */
export function createTsConfigPathResolver(compilerConfig: ts.CompilerOptions) {
  const matcher = createMatchPath(
    compilerConfig.baseUrl ?? path.join(process.cwd(), './'),
    compilerConfig.paths ?? {},
  )

  return (uri: string) =>
    tryRequest(uri, matcher, {
      extensions: ['.mpx', '.js'],
    })
}

/** Create a project-scoped package resolver for Mpx component extensions. */
export function createPackagePathResolver() {
  const resolver = enhancedResolve.create.sync({
    extensions: ['.mpx', '.js'],
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
