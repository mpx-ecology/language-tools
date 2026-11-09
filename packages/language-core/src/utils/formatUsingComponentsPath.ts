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
  getBatchStats?: () => Map<string, fs.Stats | undefined> | undefined,
) {
  type Result = {
    result?: string
    candidates: ComponentPathCandidate[]
    error?: boolean
  }
  type Dependencies = {
    dependencies: Map<string, string>
    contentDependencies?: Set<string>
    users: Set<() => void>
    stopWatching?: () => void
  }
  type Resolution = Dependencies & { value: Result }
  type Scope = Dependencies & { directory: string }
  type Entry = {
    resolution: Resolution
    scope?: Scope
    owners: Set<string>
    close(): void
  }
  const resolutions = new Map<string, Resolution>()
  const cache = new Map<string, Map<string, Entry>>()
  const versions = new Map<string, number>()
  const directories = new Map<string, { version: string; names: Set<string> }>()
  const stats = new Map<string, fs.Stats | undefined>()
  const batchRealpaths = new WeakMap<
    Map<string, fs.Stats | undefined>,
    Map<string, string | undefined>
  >()
  const batchScopes = new WeakMap<
    Map<string, fs.Stats | undefined>,
    Map<string, Scope | undefined>
  >()
  const batchDependencyChecks = new WeakMap<
    Map<string, fs.Stats | undefined>,
    WeakMap<Dependencies, boolean>
  >()
  let dependencies = new Map<string, string>()
  let contentDependencies = new Set<string>()
  let mode: string | undefined
  let discoverModes = false
  let availableModes = new Set<string>()

  function stat(fileName: string) {
    const current = getBatchStats?.() ?? stats
    if (!current.has(fileName)) current.set(fileName, readStat(fileName))
    return current.get(fileName)
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
    return readDirectoryNames(directory, trackDependency(fileName))
  }

  function readDirectoryNames(directory: string, version: string) {
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

  function resolutionScope(directory: string, request: string) {
    const batch = getBatchStats?.()
    if (!batch || process.versions.pnp || !request || request.includes('#'))
      return
    if (
      !path.isAbsolute(request) &&
      (request.startsWith('.') || /[:\\]/.test(request))
    )
      return
    let scopes = batchScopes.get(batch)
    if (!scopes) batchScopes.set(batch, (scopes = new Map()))
    return findScope(directory, scopes)
  }

  function findScope(
    directory: string,
    scopes: Map<string, Scope | undefined>,
  ): Scope | undefined {
    if (scopes.has(directory)) return scopes.get(directory)
    const version = fingerprint(stat(directory))
    const names = version && readDirectoryNames(directory, version)
    const parent = path.dirname(directory)
    let scope: Scope | undefined
    // Every omitted directory must lack both package metadata and a module
    // search location. Their fingerprints belong to the importing source.
    if (
      parent !== directory &&
      names &&
      !names.has('package.json') &&
      !names.has('node_modules')
    ) {
      const ancestor = findScope(parent, scopes)
      scope = {
        directory: ancestor?.directory ?? parent,
        dependencies: new Map([
          [directory, version],
          ...(ancestor?.dependencies ?? []),
        ]),
        users: new Set(),
      }
    }
    scopes.set(directory, scope)
    return scope
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
      resolvePackage(
        fileName,
        baseDirectory(compilerOptions.baseUrl ?? process.cwd()),
      ),
    trackDependency,
  )

  function hasChanged(
    dependencies: Map<string, string>,
    current = new Map<string, string>(),
  ) {
    const batch = getBatchStats?.()
    for (const [fileName, value] of dependencies) {
      if (!current.has(fileName))
        current.set(
          fileName,
          fingerprint(batch ? stat(fileName) : readStat(fileName)),
        )
      if (current.get(fileName) !== value) return true
    }
    return false
  }

  function getVersion(uri: string) {
    const entries = cache.get(uri)
    if (entries?.size) {
      const current = new Map<string, string>()
      for (const [request, entry] of entries) {
        if (entryChanged(entry, current)) {
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
    if (cached && !entryChanged(cached)) {
      cached.owners.add(owner)
      return cached.resolution.value
    }
    if (cached) invalidate(uri, entries, componentPath, cached)
    // Resource query mode/env are not webpack's compilation mode/env. Preserve
    // the original request on the registration; only resolve its resource path.
    let request = componentPath.split('?')[0]!
    if (request.startsWith('plugin://')) {
      return { result: request, candidates: [{ realFilename: request }] }
    }
    stats.clear()
    const importer = uriToFileName(uri)
    const directory = path.dirname(importer)
    if (request.startsWith('./') || request.startsWith('../')) {
      request = path.resolve(directory, request)
    }
    // Bare packages can resolve differently from different directories. Keep
    // the same base-directory semantics as the package resolver.
    const baseDir = baseDirectory(importer)
    const scope = resolutionScope(baseDir, request)
    const lookupDir = scope?.directory ?? baseDir
    const key = JSON.stringify([lookupDir, request])
    const previous = resolutions.get(key)
    let resolution: Resolution
    if (
      previous &&
      previous !== cached?.resolution &&
      !hasChanged(previous.dependencies)
    ) {
      resolution = previous
    } else {
      dependencies = new Map()
      contentDependencies = new Set()
      resolution = {
        value: resolveCandidates(request, lookupDir),
        dependencies,
        contentDependencies,
        users: new Set(),
      }
      resolutions.set(key, resolution)
    }
    const invalidateEntry = () => invalidate(uri, entries, componentPath, entry)
    const entry: Entry = {
      resolution,
      scope,
      owners: new Set([owner]),
      close() {
        stopUsing(resolution, invalidateEntry)
        if (scope) stopUsing(scope, invalidateEntry)
        if (!resolution.users.size && resolutions.get(key) === resolution)
          resolutions.delete(key)
      },
    }
    entries.set(componentPath, entry)
    startUsing(resolution, invalidateEntry)
    if (scope) startUsing(scope, invalidateEntry)
    return resolution.value
  }

  function baseDirectory(fileName: string) {
    return stat(fileName)?.isDirectory() ? fileName : path.dirname(fileName)
  }

  function entryChanged(entry: Entry, current = new Map<string, string>()) {
    return (
      (entry.scope && dependencyGroupChanged(entry.scope, current)) ||
      dependencyGroupChanged(entry.resolution, current)
    )
  }

  function dependencyGroupChanged(
    group: Dependencies,
    current: Map<string, string>,
  ) {
    const batch = getBatchStats?.()
    if (!batch) return hasChanged(group.dependencies, current)
    let checks = batchDependencyChecks.get(batch)
    if (!checks) batchDependencyChecks.set(batch, (checks = new WeakMap()))
    const cached = checks.get(group)
    if (cached !== undefined) return cached
    const changed = hasChanged(group.dependencies, current)
    checks.set(group, changed)
    return changed
  }

  function startUsing(group: Dependencies, notify: () => void) {
    group.users.add(notify)
    if (onChange && !group.stopWatching) {
      const invalidateGroup = () => {
        for (const user of [...group.users]) user()
      }
      const stops = [...group.dependencies].map(([fileName, version]) =>
        watchComponentDependency(
          fileName,
          group.contentDependencies?.has(fileName) ?? false,
          version,
          invalidateGroup,
        ),
      )
      group.stopWatching = () => stops.forEach(stop => stop())
    }
  }

  function stopUsing(group: Dependencies, notify: () => void) {
    group.users.delete(notify)
    if (!group.users.size) {
      group.stopWatching?.()
      group.stopWatching = undefined
    }
  }

  function resolveCandidates(request: string, directory: string): Result {
    const candidates = new Map<string, ComponentPathCandidate>()
    const explicitMode = fileMode(request)
    const modes: (string | undefined)[] = [undefined]
    availableModes = new Set()
    for (let index = 0; index < modes.length; index++) {
      mode = modes[index]
      discoverModes = index === 0 && !explicitMode
      const result =
        resolveByTsConfig(request) || resolvePackage(request, directory)
      if (discoverModes) modes.push(...availableModes)
      if (!result) continue
      const realFilename = canonicalPath(result)
      if (!realFilename) continue
      trackDependency(realFilename)
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
    return value
  }

  function canonicalPath(fileName: string) {
    const batch = getBatchStats?.()
    if (!batch) return readRealpath(fileName)
    let paths = batchRealpaths.get(batch)
    if (!paths) batchRealpaths.set(batch, (paths = new Map()))
    if (!paths.has(fileName)) paths.set(fileName, readRealpath(fileName))
    return paths.get(fileName)
  }

  function invalidate(
    uri: string,
    entries: Map<string, Entry>,
    request: string,
    entry: Entry,
  ) {
    if (entries.get(request) !== entry) return
    entries.delete(request)
    entry.close()
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
        entry.close()
      }
    }
  }

  function forget(uri: string) {
    for (const entry of cache.get(uri)?.values() ?? []) entry.close()
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

function readRealpath(fileName: string) {
  try {
    return fs.realpathSync.native(fileName).replace(/\\/g, '/')
  } catch {
    return undefined
  }
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
