/// <reference types="@volar/typescript" />

import type * as ts from 'typescript'
import type {
  MpxCompilerOptions,
  MpxLanguagePlugin,
  MpxLanguagePluginReturn,
} from './types'
import * as CompilerDOM from '@vue/compiler-dom'
import * as path from 'path-browserify'
import { resolveApplication } from './utils/resolveApplication'
import { createUsingComponentsPathResolver } from './utils/formatUsingComponentsPath'
import { LanguagePlugin, forEachEmbeddedCode } from '@volar/language-core'
import { MpxVirtualCode } from './virtualFile/mpxFile'
import { createPlugins } from './plugins'

const fileRegistries: {
  key: string
  plugins: MpxLanguagePlugin[]
  files: Map<string, MpxVirtualCode>
}[] = []

function getMpxFileRegistry(key: string, plugins: MpxLanguagePlugin[]) {
  let fileRegistry = fileRegistries.find(
    r =>
      r.key === key &&
      r.plugins.length === plugins.length &&
      r.plugins.every(plugin => plugins.includes(plugin)),
  )?.files
  if (!fileRegistry) {
    fileRegistry = new Map()
    fileRegistries.push({
      key: key,
      plugins: plugins,
      files: fileRegistry,
    })
  }
  return fileRegistry
}

function getFileRegistryKey(
  compilerOptions: ts.CompilerOptions,
  mpxCompilerOptions: MpxCompilerOptions,
  plugins: MpxLanguagePluginReturn[],
) {
  const values = [
    ...Object.keys(mpxCompilerOptions)
      .sort()
      .filter(key => key !== 'plugins')
      .map(key => [key, mpxCompilerOptions[key as keyof MpxCompilerOptions]]),
    [
      ...new Set(
        plugins.map(plugin => plugin.requiredCompilerOptions ?? []).flat(),
      ),
    ]
      .sort()
      .map(key => [key, compilerOptions[key as keyof ts.CompilerOptions]]),
  ]
  return JSON.stringify(values)
}

export function createMpxLanguagePlugin<T>(
  ts: typeof import('typescript'),
  compilerOptions: ts.CompilerOptions,
  mpxCompilerOptions: MpxCompilerOptions,
  asFileName: (scriptId: T) => string,
  asScriptId?: (fileName: string) => T,
  watchExternalDependencies = false,
  options?: { serviceScriptOnly?: boolean },
): LanguagePlugin<T, MpxVirtualCode> & {
  getExternalFilesVersion(
    fileName?: string,
    onChange?: (fileName: string) => void,
  ): string
  dispose(): void
  withComponentFileStats<R>(run: () => R): R
} {
  let componentFileStats:
    | Map<string, import('node:fs').Stats | undefined>
    | undefined
  let missingAssociatedFiles: Set<string> | undefined
  const getComponentFileStats = () => componentFileStats
  const changedFiles = new Set<string>()
  let externalProjectVersion = 0
  const pluginContext: Parameters<MpxLanguagePlugin>[0] = {
    modules: {
      '@vue/compiler-dom': CompilerDOM,
      typescript: ts,
    },
    compilerOptions,
    mpxCompilerOptions,
    serviceScriptOnly:
      options?.serviceScriptOnly === true && !mpxCompilerOptions.plugins.length,
    getComponentFileStats,
    onExternalDependencyChange: watchExternalDependencies
      ? fileName => changedFiles.add(fileName)
      : undefined,
  }
  const plugins = createPlugins(pluginContext)
  const applicationLookups = new Map<string, Map<string, Set<string>>>()
  const applicationConsumers = new Map<string, Set<string>>()
  const resolveComponent = createUsingComponentsPathResolver(
    compilerOptions,
    watchExternalDependencies
      ? importer => {
          for (const page of applicationConsumers.get(importer) ?? [])
            changedFiles.add(page)
        }
      : undefined,
  )
  // Lifecycle-sensitive code and plugins must belong to their creating project.
  const ownsFileRegistry =
    watchExternalDependencies ||
    pluginContext.serviceScriptOnly ||
    mpxCompilerOptions.plugins.length > 0 ||
    !mpxCompilerOptions.__setupedGlobalTypes
  const fileRegistry = ownsFileRegistry
    ? new Map<string, MpxVirtualCode>()
    : getMpxFileRegistry(
        getFileRegistryKey(compilerOptions, mpxCompilerOptions, plugins),
        mpxCompilerOptions.plugins,
      )

  return {
    withComponentFileStats(run) {
      if (componentFileStats) return run()
      componentFileStats = new Map()
      if (!mpxCompilerOptions.plugins.length) missingAssociatedFiles = new Set()
      try {
        return run()
      } finally {
        componentFileStats = undefined
        missingAssociatedFiles = undefined
      }
    },
    getExternalFilesVersion(fileName, onChange) {
      if (!fileName && watchExternalDependencies) {
        // A clean project has no pending paths. Drain changes once before
        // TypeScript consults the project version or reuses its current graph.
        if (changedFiles.size) {
          const pending = [...changedFiles]
          changedFiles.clear()
          externalProjectVersion++
          for (const changed of pending) onChange?.(changed)
        }
        return String(externalProjectVersion)
      }
      const file = fileName ? fileRegistry.get(fileName) : undefined
      if (fileName && !file) return ''
      const files = file ? [file] : [...fileRegistry.values()]
      if (fileName) {
        const application = files[0]?.sfc.application
        const applicationCode =
          application && fileRegistry.get(application.fileName)
        // Global registrations affect the consuming page's generated imports.
        // Refresh their owner before reading the page's dependency version.
        if (applicationCode) files.unshift(applicationCode)
      }
      return files
        .map(code => {
          const version = code.getExternalDependencyVersion()
          if (code.externalDependencyVersion !== version)
            onChange?.(code.fileName)
          return version
        })
        .join(';')
    },
    dispose() {
      resolveComponent.dispose()
      applicationLookups.clear()
      applicationConsumers.clear()
      changedFiles.clear()
      if (ownsFileRegistry) {
        for (const plugin of plugins) plugin.dispose?.()
        fileRegistry.clear()
      }
    },
    getLanguageId(scriptId) {
      const fileName = asFileName(scriptId)
      for (const plugin of plugins) {
        const languageId = plugin.getLanguageId?.(fileName)
        if (languageId) {
          return languageId
        }
      }
    },
    createVirtualCode(scriptId, languageId, snapshot, ctx) {
      const fileName = asFileName(scriptId)
      if (plugins.some(plugin => plugin.isValidFile?.(fileName, languageId))) {
        const code = fileRegistry.get(fileName)
        if (code) {
          code.update(snapshot)
          updateApplication(scriptId, code, ctx)
          return code
        } else {
          const code = new MpxVirtualCode(
            fileName,
            languageId,
            snapshot,
            mpxCompilerOptions,
            plugins,
            ts,
          )
          fileRegistry.set(fileName, code)
          updateApplication(scriptId, code, ctx)
          return code
        }
      }
    },
    disposeVirtualCode(_scriptId, code) {
      if (!ownsFileRegistry) return
      const { fileName } = code
      if (fileRegistry.get(fileName) !== code) return
      fileRegistry.delete(fileName)
      updateApplicationLookups(fileName)
      changedFiles.delete(fileName)
      for (const plugin of plugins) plugin.disposeFile?.(fileName)
      resolveComponent.forget(fileName)
    },
    updateVirtualCode(scriptId, code, snapshot, ctx) {
      code.update(snapshot)
      updateApplication(scriptId, code, ctx)
      return code
    },
    typescript: {
      extraFileExtensions: getAllExtensions(
        mpxCompilerOptions,
      ).map<ts.FileExtensionInfo>(ext => ({
        extension: ext.slice(1),
        isMixedContent: true,
        scriptKind: 7 satisfies ts.ScriptKind.Deferred,
      })),
      getServiceScript(root) {
        for (const code of forEachEmbeddedCode(root)) {
          if (/script_(js|ts)/.test(code.id)) {
            const lang = code.id.slice('script_'.length)
            return {
              code,
              preventLeadingOffset: pluginContext.serviceScriptOnly,
              extension: '.' + lang,
              scriptKind: lang === 'js' ? ts.ScriptKind.JS : ts.ScriptKind.TS,
            }
          }
        }
      },
    },
  }
  function updateApplication(
    scriptId: T,
    code: MpxVirtualCode,
    ctx: import('@volar/language-core').CodegenContext<T>,
  ) {
    const toId =
      asScriptId ??
      (typeof scriptId === 'string'
        ? (fileName: string) => fileName as T
        : undefined)
    if (!toId) return
    const configPath = compilerOptions.configFilePath
    let lookups: Map<string, Set<string>> | undefined
    code.setApplication(
      resolveApplication(
        ts,
        code.fileName,
        typeof configPath === 'string' ? path.dirname(configPath) : undefined,
        fileName => {
          if (missingAssociatedFiles?.has(fileName)) return
          const source = ctx.getAssociatedScript(toId(fileName))
          if (!source) missingAssociatedFiles?.add(fileName)
          return source?.generated?.root instanceof MpxVirtualCode
            ? source.generated.root.sfc
            : undefined
        },
        (request, importer) => {
          if (!watchExternalDependencies)
            return resolveComponent(request, importer)
          lookups ??= new Map()
          let requests = lookups.get(importer)
          if (!requests) lookups.set(importer, (requests = new Set()))
          requests.add(request)
          return resolveComponent(request, importer, code.fileName)
        },
      ),
    )
    updateApplicationLookups(code.fileName, lookups)
  }

  /** Retain package lookups only while a page consumes their application scope. */
  function updateApplicationLookups(
    fileName: string,
    next?: Map<string, Set<string>>,
  ) {
    for (const importer of applicationLookups.get(fileName)?.keys() ?? []) {
      resolveComponent.retain(importer, fileName, next?.get(importer) ?? [])
      const consumers = applicationConsumers.get(importer)!
      consumers.delete(fileName)
      if (!consumers.size) applicationConsumers.delete(importer)
    }
    applicationLookups.delete(fileName)
    for (const importer of next?.keys() ?? []) {
      let consumers = applicationConsumers.get(importer)
      if (!consumers)
        applicationConsumers.set(importer, (consumers = new Set()))
      consumers.add(fileName)
    }
    if (next?.size) applicationLookups.set(fileName, next)
  }
}

export function getAllExtensions(options: MpxCompilerOptions) {
  const result = new Set<string>()
  for (const key in options) {
    if (key === 'extensions' || key.endsWith('Extensions')) {
      const value = options[key as keyof MpxCompilerOptions]
      if (Array.isArray(value) && value.every(v => typeof v === 'string')) {
        for (const ext of value) {
          result.add(ext)
        }
      }
    }
  }
  return [...result]
}

/** Enable standalone JSON JS scripts only in hosts that support extra scripts.
 * The IDE tsserver plugin must keep using the default single service script.
 */
export function withMpxJsonServiceScripts<T>(
  plugin: LanguagePlugin<T, MpxVirtualCode>,
  jsonOnly = false,
): LanguagePlugin<T, MpxVirtualCode> {
  return {
    ...plugin,
    typescript: {
      ...plugin.typescript!,
      // JSON roots are added on demand. Keep them out of Volar's config glob.
      extraFileExtensions: jsonOnly
        ? []
        : plugin.typescript!.extraFileExtensions,
      getServiceScript: jsonOnly
        ? () => undefined
        : plugin.typescript!.getServiceScript,
      getExtraServiceScripts(fileName, root) {
        for (const code of forEachEmbeddedCode(root)) {
          if (code.id === 'json_service') {
            return [
              {
                fileName: `${fileName}.__json.cjs`,
                code,
                extension: '.cjs',
                scriptKind: 1 satisfies ts.ScriptKind.JS,
              },
            ]
          }
        }
        return []
      },
    },
  }
}

/** Keep Volar/TypeScript snapshot caches in step with file resolution changes. */
export function decorateMpxLanguageServiceHost(
  host: ts.LanguageServiceHost,
  plugin: {
    getExternalFilesVersion(
      fileName?: string,
      onChange?: (fileName: string) => void,
    ): string
  },
  onDependencyChange?: (fileName: string) => void,
) {
  const getScriptVersion = host.getScriptVersion.bind(host)
  host.getScriptVersion = fileName =>
    `${getScriptVersion(fileName)}:${plugin.getExternalFilesVersion(fileName, onDependencyChange)}`
  const getProjectVersion = host.getProjectVersion?.bind(host)
  if (getProjectVersion) {
    host.getProjectVersion = () =>
      `${getProjectVersion()}:${plugin.getExternalFilesVersion(undefined, onDependencyChange)}`
  }
}
