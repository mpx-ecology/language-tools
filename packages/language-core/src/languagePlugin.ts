/// <reference types="@volar/typescript" />

import { forEachEmbeddedCode, LanguagePlugin } from '@volar/language-core'
import * as CompilerDOM from '@vue/compiler-dom'
import type * as ts from 'typescript'
import { createPlugins } from './plugins'
import type {
  MpxCompilerOptions,
  MpxLanguagePlugin,
  MpxLanguagePluginReturn,
} from './types'
import * as CompilerVue2 from './utils/vue2TemplateCompiler'
import { MpxVirtualCode } from './virtualFile/mpxFile'

const fileRegistries: {
  key: string
  plugins: MpxLanguagePlugin[]
  files: Map<string, MpxVirtualCode>
}[] = []

function getVueFileRegistry(key: string, plugins: MpxLanguagePlugin[]) {
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
): LanguagePlugin<T, MpxVirtualCode> {
  const pluginContext: Parameters<MpxLanguagePlugin>[0] = {
    modules: {
      '@vue/compiler-dom':
        mpxCompilerOptions.target < 3
          ? {
              ...CompilerDOM,
              compile: CompilerVue2.compile,
            }
          : CompilerDOM,
      typescript: ts,
    },
    compilerOptions,
    mpxCompilerOptions,
  }
  const plugins = createPlugins(pluginContext)
  const fileRegistry = getVueFileRegistry(
    getFileRegistryKey(compilerOptions, mpxCompilerOptions, plugins),
    mpxCompilerOptions.plugins,
  )

  return {
    getLanguageId(scriptId) {
      const fileName = asFileName(scriptId)
      for (const plugin of plugins) {
        const languageId = plugin.getLanguageId?.(fileName)
        if (languageId) {
          return languageId
        }
      }
    },
    createVirtualCode(scriptId, languageId, snapshot) {
      const fileName = asFileName(scriptId)
      if (plugins.some(plugin => plugin.isValidFile?.(fileName, languageId))) {
        const code = fileRegistry.get(fileName)
        if (code) {
          code.update(snapshot)
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
          return code
        }
      }
    },
    updateVirtualCode(_fileId, code, snapshot) {
      code.update(snapshot)
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
          if (/script_(js|jsx|ts|tsx)/.test(code.id)) {
            const lang = code.id.slice('script_'.length)
            return {
              code,
              extension: '.' + lang,
              scriptKind:
                lang === 'js'
                  ? ts.ScriptKind.JS
                  : lang === 'jsx'
                    ? ts.ScriptKind.JSX
                    : lang === 'tsx'
                      ? ts.ScriptKind.TSX
                      : ts.ScriptKind.TS,
            }
          }
        }
      },
    },
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
