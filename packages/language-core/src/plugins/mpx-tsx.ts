import type { Code, Sfc, MpxLanguagePlugin } from '../types'
import * as path from 'path-browserify'
import { computed } from 'alien-signals'
import { camelize, capitalize } from '@mpxjs/language-shared'

import { generateScript } from '../codegen/script'
import { generateTemplate } from '../codegen/template'
import { parseScriptRanges } from '../parsers/scriptRanges'
import { parseScriptSetupRanges } from '../parsers/scriptSetupRanges'
import { parseMpxCompilerOptions } from '../parsers/mpxCompilerOptions'
import { computedSet } from '../utils/signals'
import { CompilerOptionsResolver } from '../utils/ts'

export const tsCodegen = new WeakMap<Sfc, ReturnType<typeof createTsx>>()

const validLangs = new Set(['js', 'jsx', 'ts', 'tsx'])

const plugin: MpxLanguagePlugin = ctx => {
  let appendedGlobalTypes = false

  return {
    name: 'mpx-tsx',

    requiredCompilerOptions: [
      'noPropertyAccessFromIndexSignature',
      'exactOptionalPropertyTypes',
    ],

    getEmbeddedCodes(fileName, sfc) {
      const codegen = useCodegen(fileName, sfc)
      return [
        {
          id: 'script_' + codegen.getLang(),
          lang: codegen.getLang(),
        },
      ]
    },

    resolveEmbeddedCode(fileName, sfc, embeddedFile) {
      if (/script_(js|jsx|ts|tsx)/.test(embeddedFile.id)) {
        const codegen = useCodegen(fileName, sfc)
        const tsx = codegen.getGeneratedScript()
        if (tsx) {
          embeddedFile.content = [...tsx.codes]
        }
      }
    },
  }

  function useCodegen(fileName: string, sfc: Sfc) {
    if (!tsCodegen.has(sfc)) {
      let appendGlobalTypes = false
      if (
        !ctx.mpxCompilerOptions.__setupedGlobalTypes &&
        !appendedGlobalTypes
      ) {
        appendGlobalTypes = true
        appendedGlobalTypes = true
      }
      tsCodegen.set(sfc, createTsx(fileName, sfc, ctx, appendGlobalTypes))
    }
    return tsCodegen.get(sfc)!
  }
}

export default plugin

function createTsx(
  fileName: string,
  sfc: Sfc,
  ctx: Parameters<MpxLanguagePlugin>[0],
  appendGlobalTypes: boolean,
) {
  const ts = ctx.modules.typescript

  const getRawLang = computed(() => {
    if (sfc.script && sfc.scriptSetup) {
      if (sfc.scriptSetup.lang !== 'js') {
        return sfc.scriptSetup.lang
      } else {
        return sfc.script.lang
      }
    }
    return sfc.scriptSetup?.lang ?? sfc.script?.lang
  })

  const getLang = computed(() => {
    const rawLang = getRawLang()
    if (rawLang && validLangs.has(rawLang)) {
      return rawLang
    }
    return 'ts'
  })

  const getResolvedOptions = computed(() => {
    const options = parseMpxCompilerOptions(sfc.comments)
    if (options) {
      const resolver = new CompilerOptionsResolver()
      resolver.addConfig(options, path.dirname(fileName))
      return resolver.build(ctx.mpxCompilerOptions)
    }
    return ctx.mpxCompilerOptions
  })

  const getScriptRanges = computed(() =>
    sfc.script && validLangs.has(sfc.script.lang)
      ? parseScriptRanges(ts, sfc.script.ast, !!sfc.scriptSetup, false)
      : undefined,
  )

  const getScriptSetupRanges = computed(() =>
    sfc.scriptSetup && validLangs.has(sfc.scriptSetup.lang)
      ? parseScriptSetupRanges(ts, sfc.scriptSetup.ast, getResolvedOptions())
      : undefined,
  )

  const getSetupBindingNames = computedSet(() => {
    const newNames = new Set<string>()
    const bindings = getScriptSetupRanges()?.bindings
    if (sfc.scriptSetup && bindings) {
      for (const { range } of bindings) {
        newNames.add(sfc.scriptSetup.content.slice(range.start, range.end))
      }
    }
    return newNames
  })

  const getSetupImportComponentNames = computedSet(() => {
    const newNames = new Set<string>()
    const bindings = getScriptSetupRanges()?.bindings
    if (sfc.scriptSetup && bindings) {
      for (const {
        range,
        moduleName,
        isDefaultImport,
        isNamespace,
      } of bindings) {
        if (
          moduleName &&
          isDefaultImport &&
          !isNamespace &&
          ctx.mpxCompilerOptions.extensions.some(ext =>
            moduleName.endsWith(ext),
          )
        ) {
          newNames.add(sfc.scriptSetup.content.slice(range.start, range.end))
        }
      }
    }
    return newNames
  })

  const getSetupDestructuredPropNames = computedSet(() => {
    const newNames = new Set(
      getScriptSetupRanges()?.defineProps?.destructured?.keys(),
    )
    const rest = getScriptSetupRanges()?.defineProps?.destructuredRest
    if (rest) {
      newNames.add(rest)
    }
    return newNames
  })

  const getSetupTemplateRefNames = computedSet(() => {
    const newNames = new Set(
      getScriptSetupRanges()
        ?.useTemplateRef.map(({ name }) => name)
        .filter(name => name !== undefined),
    )
    return newNames
  })

  const setupHasDefineSlots = computed(
    () => !!getScriptSetupRanges()?.defineSlots,
  )

  const getSetupSlotsAssignName = computed(
    () => getScriptSetupRanges()?.defineSlots?.name,
  )

  const getSetupPropsAssignName = computed(
    () => getScriptSetupRanges()?.defineProps?.name,
  )

  const getSetupInheritAttrs = computed(() => {
    const value =
      getScriptSetupRanges()?.defineOptions?.inheritAttrs ??
      getScriptRanges()?.exportDefault?.inheritAttrsOption
    return value !== 'false'
  })

  const getComponentSelfName = computed(() => {
    const { exportDefault } = getScriptRanges() ?? {}
    if (sfc.script && exportDefault?.nameOption) {
      const { nameOption } = exportDefault
      return sfc.script.content.slice(nameOption.start + 1, nameOption.end - 1)
    }
    const { defineOptions } = getScriptSetupRanges() ?? {}
    if (sfc.scriptSetup && defineOptions?.name) {
      return defineOptions.name
    }
    const baseName = path.basename(fileName)
    return capitalize(camelize(baseName.slice(0, baseName.lastIndexOf('.'))))
  })

  const getGeneratedTemplate = computed(() => {
    if (getResolvedOptions().skipTemplateCodegen || !sfc.template) {
      return
    }

    const codes: Code[] = []
    const codegen = generateTemplate({
      ts,
      compilerOptions: ctx.compilerOptions,
      mpxCompilerOptions: getResolvedOptions(),
      template: sfc.template,
      scriptSetupBindingNames: getSetupBindingNames(),
      scriptSetupImportComponentNames: getSetupImportComponentNames(),
      destructuredPropNames: getSetupDestructuredPropNames(),
      templateRefNames: getSetupTemplateRefNames(),
      hasDefineSlots: setupHasDefineSlots(),
      slotsAssignName: getSetupSlotsAssignName(),
      propsAssignName: getSetupPropsAssignName(),
      inheritAttrs: getSetupInheritAttrs(),
      selfComponentName: getComponentSelfName(),
    })

    let current = codegen.next()
    while (!current.done) {
      const code = current.value
      codes.push(code)
      current = codegen.next()
    }

    return {
      ...current.value,
      codes,
    }
  })

  const getGeneratedScript = computed(() => {
    const codes: Code[] = []
    const codegen = generateScript({
      ts,
      compilerOptions: ctx.compilerOptions,
      mpxCompilerOptions: getResolvedOptions(),
      sfc: sfc,
      fileName,
      lang: getLang(),
      scriptRanges: getScriptRanges(),
      scriptSetupRanges: getScriptSetupRanges(),
      templateCodegen: getGeneratedTemplate(),
      destructuredPropNames: getSetupDestructuredPropNames(),
      templateRefNames: getSetupTemplateRefNames(),
      appendGlobalTypes,
    })

    let current = codegen.next()
    while (!current.done) {
      const code = current.value
      codes.push(code)
      current = codegen.next()
    }

    return {
      ...current.value,
      codes,
    }
  })

  return {
    getScriptRanges,
    getScriptSetupRanges,
    getLang,
    getGeneratedScript,
    getGeneratedTemplate,
  }
}
