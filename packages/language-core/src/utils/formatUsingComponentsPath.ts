import type * as ts from 'typescript'
import type { ResolvedUsingComponentInfo } from '../types'
import * as fs from 'node:fs'
import * as path from 'node:path'
import { URI } from 'vscode-uri'
import {
  createPackagePathResolver,
  createTsConfigPathResolver,
} from './resolve'

export const uriToFileName = (uri: string) =>
  uri.startsWith('file:')
    ? URI.parse(uri).fsPath.replace(/\\/g, '/')
    : uri.replace(/\\/g, '/')

// File modes supported by Mpx (noMode is a template condition, not a file mode).
export const componentFileModes = [
  'wx',
  'ali',
  'swan',
  'tt',
  'qq',
  'web',
  'qa',
  'jd',
  'dd',
  'ios',
  'android',
  'harmony',
  'ks',
] as const

export interface ComponentResolutionOptions {
  mode?: string
  env?: string
}

export type ComponentPathCandidate = Pick<
  ResolvedUsingComponentInfo,
  'realFilename' | 'mode' | 'env'
> & { realFilename: string }

/** The same project-scoped result supplies imports, links and definitions. */
export function createUsingComponentsPathResolver(
  compilerOptions: ts.CompilerOptions,
  options: ComponentResolutionOptions = {},
) {
  type Result = {
    result?: string
    candidates: ComponentPathCandidate[]
    error?: boolean
  }
  const cache = new Map<
    string,
    Map<
      string,
      { value: Result; dependencies: Map<string, string>; owners: Set<string> }
    >
  >()
  const versions = new Map<string, number>()
  let dependencies = new Map<string, string>()
  let mode: string | undefined
  let discoverModes = false
  let availableModes = new Set<string>()

  function trackDependency(fileName: string, content = false) {
    const dependency = content ? fileName : path.dirname(fileName)
    if (!dependencies.has(dependency))
      dependencies.set(dependency, fingerprint(dependency))
  }

  function resolveFile(fileName: string) {
    const ext = path.extname(fileName)
    if (discoverModes && ['.mpx', '.js'].includes(ext)) {
      const stem = fileName.slice(0, -ext.length)
      // Probe siblings at the same file hook used by Mpx. Only real platform
      // variants need another package/alias traversal; a generic fallback is
      // already represented by the first resolution.
      for (const candidateMode of componentFileModes) {
        for (const infix of options.env ? ['.' + options.env, ''] : ['']) {
          const candidate = `${stem}.${candidateMode}${infix}${ext}`
          trackDependency(candidate)
          try {
            if (fs.statSync(candidate).isFile())
              availableModes.add(candidateMode)
          } catch {
            /* Missing platform siblings still share the dependency directory. */
          }
        }
      }
    }
    for (const candidate of platformFiles(fileName, mode, options.env)) {
      trackDependency(candidate)
      try {
        if (fs.statSync(candidate).isFile()) return candidate
      } catch {
        /* Missing candidates are dependencies too. */
      }
    }
  }

  const resolvePackage = createPackagePathResolver(resolveFile, trackDependency)
  const resolveByTsConfig = createTsConfigPathResolver(
    compilerOptions,
    fileName =>
      resolvePackage(fileName, compilerOptions.baseUrl ?? process.cwd()),
    trackDependency,
  )

  function hasChanged(
    dependencies: Map<string, string>,
    current = new Map<string, string>(),
  ) {
    return [...dependencies].some(([fileName, value]) => {
      if (!current.has(fileName)) current.set(fileName, fingerprint(fileName))
      return current.get(fileName) !== value
    })
  }

  function getVersion(uri: string) {
    const entries = cache.get(uri)
    const current = new Map<string, string>()
    for (const [request, entry] of entries ?? []) {
      if (hasChanged(entry.dependencies, current)) {
        entries!.delete(request)
        versions.set(uri, (versions.get(uri) ?? 0) + 1)
      }
    }
    return versions.get(uri) ?? 0
  }

  function resolveUsingComponentsPath(
    componentPath = '',
    uri: string,
    owner = 'request',
  ): Result | undefined {
    if (!componentPath) return
    let entries = cache.get(uri)
    if (!entries) cache.set(uri, (entries = new Map()))
    const cached = entries.get(componentPath)
    if (cached && !hasChanged(cached.dependencies)) {
      cached.owners.add(owner)
      return cached.value
    }
    if (cached) {
      entries.delete(componentPath)
      versions.set(uri, (versions.get(uri) ?? 0) + 1)
    }
    dependencies = new Map()
    // Resource query mode/env are not webpack's compilation mode/env. Preserve
    // the original request on the registration; only resolve its resource path.
    let request = componentPath.split('?')[0]!
    if (request.startsWith('plugin://')) {
      return { result: request, candidates: [{ realFilename: request }] }
    }
    const importer = uriToFileName(uri)
    if (request.startsWith('./') || request.startsWith('../')) {
      request = path.resolve(path.dirname(importer), request)
    }
    const candidates = new Map<string, ComponentPathCandidate>()
    const explicitMode = fileMode(request)
    const modes: (string | undefined)[] = [options.mode]
    availableModes = new Set()
    for (let index = 0; index < modes.length; index++) {
      mode = modes[index]
      discoverModes = index === 0 && !options.mode && !explicitMode
      const result =
        resolveByTsConfig(request) || resolvePackage(request, importer)
      if (discoverModes) modes.push(...availableModes)
      if (!result) continue
      let realFilename: string
      try {
        realFilename = fs.realpathSync(result).replace(/\\/g, '/')
      } catch {
        continue
      }
      if (!candidates.has(realFilename)) {
        candidates.set(realFilename, {
          realFilename,
          mode: fileMode(realFilename),
          env:
            options.env &&
            realFilename.endsWith(
              '.' + options.env + path.extname(realFilename),
            )
              ? options.env
              : undefined,
        })
      }
    }
    const value: Result = {
      result: candidates.keys().next().value,
      candidates: [...candidates.values()],
    }
    if (!value.result) value.error = true
    entries.set(componentPath, {
      value,
      dependencies,
      owners: new Set([owner]),
    })
    return value
  }

  function retain(uri: string, owner: string, requests: Iterable<string>) {
    const active = new Set(requests)
    const entries = cache.get(uri)
    for (const [request, entry] of entries ?? []) {
      if (!active.has(request)) entry.owners.delete(owner)
      if (!entry.owners.size) entries!.delete(request)
    }
  }

  return Object.assign(resolveUsingComponentsPath, { getVersion, retain })
}

function fingerprint(fileName: string) {
  try {
    const stat = fs.statSync(fileName)
    return `${stat.ino}:${stat.mtimeMs}:${stat.ctimeMs}:${stat.size}`
  } catch {
    return ''
  }
}

function platformFiles(fileName: string, mode?: string, env?: string) {
  const ext = path.extname(fileName)
  if (!['.mpx', '.js'].includes(ext)) return [fileName]
  const basename = path.basename(fileName, ext).split('.').slice(1)
  const fallbackMode =
    mode === 'android' || mode === 'harmony' ? 'ios' : undefined
  const stems: string[] = []
  if (
    mode &&
    !basename.includes(mode) &&
    !(fallbackMode && basename.includes(fallbackMode))
  ) {
    stems.push(fileName.slice(0, -ext.length) + '.' + mode)
    if (fallbackMode)
      stems.push(fileName.slice(0, -ext.length) + '.' + fallbackMode)
  }
  stems.push(fileName.slice(0, -ext.length))
  return stems.flatMap(stem =>
    env && !stem.endsWith('.' + env)
      ? [stem + '.' + env + ext, stem + ext]
      : [stem + ext],
  )
}

function fileMode(fileName: string) {
  const parts = path.basename(fileName).split('.').slice(1)
  return parts.find(part =>
    componentFileModes.includes(part as (typeof componentFileModes)[number]),
  )
}
