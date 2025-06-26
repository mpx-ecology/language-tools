import type * as ts from 'typescript'
import { posix as path } from 'path-browserify'
import type {
  MpxCompilerOptions,
  MpxLanguagePlugin,
  RawMpxCompilerOptions,
} from '../types'

import { camelize } from '@mpxjs/language-shared'
import { getAllExtensions } from '../languagePlugin'
import { hyphenateTag } from './shared'
import {
  generateGlobalTypes,
  getGlobalTypesFileName,
} from '../codegen/globalTypes'

export function createParsedCommandLineByJson(
  ts: typeof import('typescript'),
  parseConfigHost: ts.ParseConfigHost & {
    writeFile?(path: string, data: string): void
  },
  rootDir: string,
  json: any,
  configFileName = rootDir + '/jsconfig.json',
  skipGlobalTypesSetup = false,
): ParsedCommandLine {
  const proxyHost = proxyParseConfigHostForExtendConfigPaths(parseConfigHost)
  ts.parseJsonConfigFileContent(
    json,
    proxyHost.host,
    rootDir,
    {},
    configFileName,
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
      rootDir,
      resolvedMpxOptions,
      parseConfigHost,
    )
  }
  const parsed = ts.parseJsonConfigFileContent(
    json,
    proxyHost.host,
    rootDir,
    {},
    configFileName,
    undefined,
    getAllExtensions(resolvedMpxOptions).map(extension => ({
      extension: extension.slice(1),
      isMixedContent: true,
      scriptKind: ts.ScriptKind.Deferred,
    })),
  )

  // patching ts server broke with outDir + rootDir + composite/incremental
  parsed.options.outDir = undefined

  return {
    ...parsed,
    mpxOptions: resolvedMpxOptions,
  }
}

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
  target = 99
  plugins: MpxLanguagePlugin[] = []

  addConfig(options: RawMpxCompilerOptions, rootDir: string) {
    for (const key in options) {
      switch (key) {
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
    defaults ??= getDefaultCompilerOptions(
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
      '.mpx-global-types',
      getGlobalTypesFileName(mpxOptions),
    )
    const globalTypesContents =
      `// @ts-nocheck\n` + `export {};\n` + generateGlobalTypes(mpxOptions)
    host.writeFile(globalTypesPath, globalTypesContents)
    return { absolutePath: globalTypesPath }
  } catch {
    // noop
    console.warn(
      '[Mpx] Failed to setup global types, please check if the mpx package is installed.',
    )
  }
}

export function getDefaultCompilerOptions(
  lib = '@mpxjs/core',
  strictTemplates = false,
): MpxCompilerOptions {
  return {
    lib,
    extensions: ['.mpx'],
    petiteMpxExtensions: [],
    strictSlotChildren: strictTemplates,
    strictWxModel: strictTemplates,
    checkUnknownProps: strictTemplates,
    checkUnknownEvents: strictTemplates,
    checkUnknownDirectives: strictTemplates,
    checkUnknownComponents: strictTemplates,
    inferComponentDollarEl: false,
    inferComponentDollarRefs: false,
    inferTemplateDollarRefs: false,
    inferTemplateDollarSlots: false,
    skipTemplateCheck: false,
    fallthroughAttributes: false,
    fallthroughComponentNames: [],
    dataAttributes: [],
    htmlAttributes: ['aria-*'],
    optionsWrapper: [`(await import('${lib}')).defineComponent(`, `)`],
    optionsComponentCtor: ['createComponent'],
    optionsPageCtor: ['createPage'],
    macros: {
      defineProps: ['defineProps'],
      defineSlots: ['defineSlots'],
      defineExpose: ['defineExpose'],
      defineModel: ['defineModel'],
      defineOptions: ['defineOptions'],
      withDefaults: ['withDefaults'],
    },
    composables: {
      useTemplateRef: ['useTemplateRef', 'templateRef'],
    },
    plugins: [],
    experimentalDefinePropProposal: false,
    experimentalResolveStyleCssClasses: 'always',
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
