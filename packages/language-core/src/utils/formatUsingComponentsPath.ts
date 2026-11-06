import type * as ts from 'typescript'
import type { ResolvedUsingComponentInfo } from '../types'
import * as fs from 'node:fs'
import * as path from 'node:path'
import { URI } from 'vscode-uri'
import { watchComponentDependency } from './componentDependencyWatcher'
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

export type ComponentPathCandidate = Pick<
  ResolvedUsingComponentInfo,
  'realFilename' | 'mode'
> & { realFilename: string }

/**
 * Aggregate the targets of possible Mpx builds. The IDE has no active build
 * platform: candidates are choices for navigation, not a platform selection.
 * The same project-scoped result supplies imports, links and definitions.
 */
export function createUsingComponentsPathResolver(
  compilerOptions: ts.CompilerOptions,
  onChange?: (uri: string) => void,
) {
  type Result = {
    result?: string
    candidates: ComponentPathCandidate[]
    error?: boolean
  }
  type Entry = {
    value: Result
    dependencies: Map<string, string>
    owners: Set<string>
    close?: () => void
  }
  const cache = new Map<string, Map<string, Entry>>()
  const versions = new Map<string, number>()
  const directories = new Map<string, { version: string; names: Set<string> }>()
  const stats = new Map<string, fs.Stats | undefined>()
  let dependencies = new Map<string, string>()
  let contentDependencies = new Set<string>()
  let mode: string | undefined
  let discoverModes = false
  let availableModes = new Set<string>()

  function stat(fileName: string) {
    if (!stats.has(fileName)) stats.set(fileName, readStat(fileName))
    return stats.get(fileName)
  }

  function trackDependency(fileName: string, content = false) {
    const dependency = content ? fileName : path.dirname(fileName)
    if (content && onChange) contentDependencies.add(dependency)
    let version = dependencies.get(dependency)
    if (version === undefined) {
      version = fingerprint(stat(dependency))
      dependencies.set(dependency, version)
    }
    return version
  }

  function siblingNames(fileName: string) {
    const directory = path.dirname(fileName)
    const version = trackDependency(fileName)
    const cached = directories.get(directory)
    if (cached?.version === version) return cached.names
    try {
      const names = new Set(fs.readdirSync(directory).map(foldName))
      directories.set(directory, { version, names })
      return names
    } catch {
      // Keep individual probes available on filesystems that cannot list a directory.
    }
  }

  function resolveFile(fileName: string) {
    const ext = path.extname(fileName)
    if (discoverModes && ['.mpx', '.js'].includes(ext)) {
      const stem = fileName.slice(0, -ext.length)
      // Probe siblings at the same file hook used by Mpx. Only real platform
      // variants need another package/alias traversal; a generic fallback is
      // already represented by the first resolution.
      const names = siblingNames(fileName)
      for (const candidateMode of componentFileModes) {
        const candidate = `${stem}.${candidateMode}${ext}`
        if (
          (!names || names.has(foldName(path.basename(candidate)))) &&
          stat(candidate)?.isFile()
        )
          availableModes.add(candidateMode)
      }
    }
    for (const candidate of platformFiles(fileName, mode)) {
      trackDependency(candidate)
      if (stat(candidate)?.isFile()) return candidate
    }
  }

  const resolvePackage = createPackagePathResolver(
    resolveFile,
    trackDependency,
    stat,
  )
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
    for (const [fileName, value] of dependencies) {
      if (!current.has(fileName))
        current.set(fileName, fingerprint(readStat(fileName)))
      if (current.get(fileName) !== value) return true
    }
    return false
  }

  function getVersion(uri: string) {
    const entries = cache.get(uri)
    if (entries?.size) {
      const current = new Map<string, string>()
      for (const [request, entry] of entries) {
        if (hasChanged(entry.dependencies, current)) {
          invalidate(uri, entries, request, entry)
        }
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
    if (cached) invalidate(uri, entries, componentPath, cached)
    stats.clear()
    dependencies = new Map()
    contentDependencies = new Set()
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
    const modes: (string | undefined)[] = [undefined]
    availableModes = new Set()
    for (let index = 0; index < modes.length; index++) {
      mode = modes[index]
      discoverModes = index === 0 && !explicitMode
      const result =
        resolveByTsConfig(request) || resolvePackage(request, importer)
      if (discoverModes) modes.push(...availableModes)
      if (!result) continue
      let realFilename: string
      try {
        realFilename = fs.realpathSync.native(result).replace(/\\/g, '/')
      } catch {
        continue
      }
      if (!candidates.has(realFilename)) {
        candidates.set(realFilename, {
          realFilename,
          mode: fileMode(realFilename),
        })
      }
    }
    const value: Result = {
      result: candidates.keys().next().value,
      candidates: [...candidates.values()],
    }
    if (!value.result) value.error = true
    const entry: Entry = { value, dependencies, owners: new Set([owner]) }
    entries.set(componentPath, entry)
    if (onChange) {
      const invalidateEntry = () =>
        invalidate(uri, entries, componentPath, entry)
      const closes = [...dependencies.keys()].map(fileName =>
        watchComponentDependency(
          fileName,
          contentDependencies.has(fileName),
          invalidateEntry,
        ),
      )
      entry.close = () => closes.forEach(close => close())
    }
    return value
  }

  function invalidate(
    uri: string,
    entries: Map<string, Entry>,
    request: string,
    entry: Entry,
  ) {
    if (entries.get(request) !== entry) return
    entries.delete(request)
    entry.close?.()
    versions.set(uri, (versions.get(uri) ?? 0) + 1)
    onChange?.(uri)
  }

  function retain(uri: string, owner: string, requests: Iterable<string>) {
    const active = new Set(requests)
    const entries = cache.get(uri)
    for (const [request, entry] of entries ?? []) {
      if (!active.has(request)) entry.owners.delete(owner)
      if (!entry.owners.size) {
        entries!.delete(request)
        entry.close?.()
      }
    }
  }

  function forget(uri: string) {
    for (const entry of cache.get(uri)?.values() ?? []) entry.close?.()
    cache.delete(uri)
    versions.delete(uri)
  }

  function dispose() {
    for (const uri of cache.keys()) forget(uri)
    versions.clear()
    directories.clear()
    stats.clear()
  }

  return Object.assign(resolveUsingComponentsPath, {
    getVersion,
    retain,
    forget,
    dispose,
  })
}

function readStat(fileName: string) {
  try {
    return fs.statSync(fileName, { throwIfNoEntry: false })
  } catch {
    return undefined
  }
}

function fingerprint(stat: fs.Stats | undefined) {
  return stat ? `${stat.ino}:${stat.mtimeMs}:${stat.ctimeMs}:${stat.size}` : ''
}

function foldName(name: string) {
  return name.normalize('NFC').toLowerCase()
}

function platformFiles(fileName: string, mode?: string) {
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
  return stems.map(stem => stem + ext)
}

function fileMode(fileName: string) {
  const parts = path.basename(fileName).split('.').slice(1)
  return parts.find(part =>
    componentFileModes.includes(part as (typeof componentFileModes)[number]),
  )
}
