import type * as ts from 'typescript'
import { posix as path } from 'path-browserify'
import {
  MpxCompilerOptions,
  MpxLanguagePlugin,
  RawMpxCompilerOptions,
} from '../types'
import { getAllExtensions } from '../languagePlugin'
import { camelize, hyphenateTag } from './shared'
import {
  generateGlobalTypes,
  getGlobalTypesFileName,
} from '../codegen/globalTypes'

export type ParsedCommandLine = ts.ParsedCommandLine & {
  mpxOptions: MpxCompilerOptions
}

export function createParsedCommandLine(
  ts: typeof import('typescript'),
  parseConfigHost: ts.ParseConfigHost,
  tsConfigPath: string,
  skipGlobalTypesSetup = false,
): ParsedCommandLine {
  try {
    const proxyHost = proxyParseConfigHostForExtendConfigPaths(parseConfigHost)
    const config = ts.readJsonConfigFile(tsConfigPath, proxyHost.host.readFile)
    ts.parseJsonSourceFileConfigFileContent(
      config,
      proxyHost.host,
      path.dirname(tsConfigPath),
      {},
      tsConfigPath,
    )

    const resolver = new CompilerOptionsResolver()

    for (const extendPath of proxyHost.extendConfigPaths.reverse()) {
      try {
        const configFile = ts.readJsonConfigFile(
          extendPath,
          proxyHost.host.readFile,
        )
        const obj = ts.convertToObject(configFile, [])
        const rawOptions: RawMpxCompilerOptions = obj?.mpxCompilerOptions ?? {}
        resolver.addConfig(rawOptions, path.dirname(configFile.fileName))
      } catch (err) {
        // noop
      }
    }

    const resolvedMpxOptions = resolver.build()

    if (skipGlobalTypesSetup) {
      resolvedMpxOptions.__setupedGlobalTypes = true
    } else {
      resolvedMpxOptions.__setupedGlobalTypes = setupGlobalTypes(
        path.dirname(tsConfigPath),
        resolvedMpxOptions,
        parseConfigHost,
      )
    }
    const parsed = ts.parseJsonSourceFileConfigFileContent(
      config,
      proxyHost.host,
      path.dirname(tsConfigPath),
      {},
      tsConfigPath,
      undefined,
      getAllExtensions(resolvedMpxOptions).map(extension => ({
        extension: extension.slice(1),
        isMixedContent: true,
        scriptKind: ts.ScriptKind.Deferred,
      })),
    )

    // fix https://github.com/vuejs/language-tools/issues/1786
    // https://github.com/microsoft/TypeScript/issues/30457
    // patching ts server broke with outDir + rootDir + composite/incremental
    parsed.options.outDir = undefined

    return {
      ...parsed,
      mpxOptions: resolvedMpxOptions,
    }
  } catch (err) {
    // console.warn('Failed to resolve tsconfig path:', tsConfigPath, err);
    return {
      fileNames: [],
      options: {},
      mpxOptions: getDefaultCompilerOptions(),
      errors: [],
    }
  }
}

function proxyParseConfigHostForExtendConfigPaths(
  parseConfigHost: ts.ParseConfigHost,
) {
  const extendConfigPaths: string[] = []
  const host = new Proxy(parseConfigHost, {
    get(target, key) {
      if (key === 'readFile') {
        return (fileName: string) => {
          if (
            !fileName.endsWith('/package.json') &&
            !extendConfigPaths.includes(fileName)
          ) {
            extendConfigPaths.push(fileName)
          }
          return target.readFile(fileName)
        }
      }
      return target[key as keyof typeof target]
    },
  })
  return {
    host,
    extendConfigPaths,
  }
}

export class CompilerOptionsResolver {
  options: Omit<RawMpxCompilerOptions, 'target' | 'plugin'> = {}
  fallbackTarget: number | undefined = 2.7
  target: number | undefined
  plugins: MpxLanguagePlugin[] = []

  addConfig(options: RawMpxCompilerOptions, rootDir: string) {
    for (const key in options) {
      switch (key) {
        case 'target': {
          const target = options.target!
          if (typeof target === 'string') {
            this.target = 2.7
          } else {
            this.target = target
          }
          break
        }
        case 'plugins': {
          this.plugins = (options.plugins ?? []).map<MpxLanguagePlugin>(
            (pluginPath: string) => {
              try {
                const resolvedPath = resolvePath(pluginPath, rootDir)
                if (resolvedPath) {
                  const plugin = require(resolvedPath)
                  plugin.__moduleName = pluginPath
                  return plugin
                } else {
                  console.warn('[Mpx] Load plugin failed:', pluginPath)
                }
              } catch (error) {
                console.warn(
                  '[Mpx] Resolve plugin path failed:',
                  pluginPath,
                  error,
                )
              }
              return []
            },
          )
          break
        }
        default:
          // @ts-expect-error ignore
          this.options[key] = options[key]
          break
      }
    }
  }

  build(defaults?: MpxCompilerOptions): MpxCompilerOptions {
    const target = this.target ?? this.fallbackTarget
    defaults ??= getDefaultCompilerOptions(
      target,
      this.options.lib,
      this.options.strictTemplates,
    )
    return {
      ...defaults,
      ...this.options,
      plugins: this.plugins,
      macros: {
        ...defaults.macros,
        ...this.options.macros,
      },
      composables: {
        ...defaults.composables,
        ...this.options.composables,
      },
      fallthroughComponentNames: [
        ...defaults.fallthroughComponentNames,
        ...(this.options.fallthroughComponentNames ?? []),
      ].map(hyphenateTag),
      experimentalModelPropName: Object.fromEntries(
        Object.entries(
          this.options.experimentalModelPropName ??
            defaults.experimentalModelPropName,
        ).map(([k, v]) => [camelize(k), v]),
      ),
    }
  }
}

function resolvePath(scriptPath: string, root: string) {
  try {
    if (require?.resolve) {
      return require.resolve(scriptPath, { paths: [root] })
    } else {
      // console.warn('failed to resolve path:', scriptPath, 'require.resolve is not supported in web');
    }
  } catch (error) {
    // console.warn(error);
  }
}

export function setupGlobalTypes(
  rootDir: string,
  mpxOptions: MpxCompilerOptions,
  host: {
    fileExists(path: string): boolean
    writeFile?(path: string, data: string): void
  },
): MpxCompilerOptions['__setupedGlobalTypes'] {
  if (!host.writeFile) {
    return
  }
  try {
    let dir = rootDir
    while (
      !host.fileExists(
        path.join(dir, 'node_modules', mpxOptions.lib, 'package.json'),
      )
    ) {
      const parentDir = path.dirname(dir)
      if (dir === parentDir) {
        throw 0
      }
      dir = parentDir
    }
    const globalTypesPath = path.join(
      dir,
      'node_modules',
      '.vue-global-types',
      getGlobalTypesFileName(mpxOptions),
    )
    const globalTypesContents =
      `// @ts-nocheck\nexport {};\n` + generateGlobalTypes(mpxOptions)
    host.writeFile(globalTypesPath, globalTypesContents)
    return { absolutePath: globalTypesPath }
  } catch {
    // noop
  }
}

export function getDefaultCompilerOptions(
  target = 99,
  lib = 'vue',
  strictTemplates = false,
): MpxCompilerOptions {
  return {
    target,
    lib,
    extensions: ['.mpx'],
    vitePressExtensions: [],
    petiteMpxExtensions: [],
    jsxSlots: false,
    strictSlotChildren: strictTemplates,
    strictVModel: strictTemplates,
    checkUnknownProps: strictTemplates,
    checkUnknownEvents: strictTemplates,
    checkUnknownDirectives: strictTemplates,
    checkUnknownComponents: strictTemplates,
    inferComponentDollarEl: false,
    inferComponentDollarRefs: false,
    inferTemplateDollarAttrs: false,
    inferTemplateDollarEl: false,
    inferTemplateDollarRefs: false,
    inferTemplateDollarSlots: false,
    skipTemplateCodegen: false,
    fallthroughAttributes: false,
    fallthroughComponentNames: [
      'Transition',
      'KeepAlive',
      'Teleport',
      'Suspense',
    ],
    dataAttributes: [],
    htmlAttributes: ['aria-*'],
    optionsWrapper:
      target >= 2.7
        ? [`(await import('${lib}')).defineComponent(`, `)`]
        : [`(await import('${lib}')).default.extend(`, `)`],
    macros: {
      defineProps: ['defineProps'],
      defineSlots: ['defineSlots'],
      defineEmits: ['defineEmits'],
      defineExpose: ['defineExpose'],
      defineModel: ['defineModel'],
      defineOptions: ['defineOptions'],
      withDefaults: ['withDefaults'],
    },
    composables: {
      useAttrs: ['useAttrs'],
      useCssModule: ['useCssModule'],
      useSlots: ['useSlots'],
      useTemplateRef: ['useTemplateRef', 'templateRef'],
    },
    plugins: [],
    experimentalDefinePropProposal: false,
    experimentalResolveStyleCssClasses: 'scoped',
    experimentalModelPropName: {
      '': {
        input: true,
      },
      value: {
        input: { type: 'text' },
        textarea: true,
        select: true,
      },
    },
  }
}
