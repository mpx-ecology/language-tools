import type { Code } from '../../types'
import type { ScriptCodegenOptions } from './index'
import type { ScriptCodegenContext } from './context'

import { codeFeatures } from '../codeFeatures'
import {
  type TemplateCodegenContext,
  createTemplateCodegenContext,
} from '../template/context'
import { generateInterpolation } from '../template/interpolation'
import { generateStyleScopedClassReferences } from '../template/styleScopedClasses'
import { generateStyleModules } from '../style/modules'
import { generateStyleScopedClasses } from '../style/scopedClasses'
import { endOfLine, newLine } from '../utils'
import { hyphenateTag } from '../../utils/shared'

export function* generateTemplate(
  options: ScriptCodegenOptions,
  ctx: ScriptCodegenContext,
): Generator<Code, TemplateCodegenContext> {
  ctx.generatedTemplate = true

  const templateCodegenCtx = createTemplateCodegenContext({
    scriptSetupBindingNames: new Set(),
  })
  yield* generateTemplateCtx(options)
  yield* generateTemplateElements()
  yield* generateTemplateComponents()
  yield* generateTemplateDirectives(options)
  yield* generateTemplateBody(options, templateCodegenCtx)
  return templateCodegenCtx
}

function* generateTemplateCtx(options: ScriptCodegenOptions): Generator<Code> {
  if (options.sfc.scriptSetup) {
    const { defineProps, defineExpose } = options.scriptSetupRanges || {}
    if (!defineProps) {
      yield `const __VLS_defineProps = {}${endOfLine}`
    }
    if (!defineExpose) {
      yield `const __VLS_defineExposeUnrefs = {}${endOfLine}`
    } else {
      yield `const __VLS_defineExposeUnrefs = __VLS_defineExpose as any as UnwrapRefs<typeof __VLS_defineExpose>${newLine}`
    }
    yield `const __MPX_ctx = { ...__MPX_dollars, ...__VLS_defineProps, ...__VLS_defineExposeUnrefs }${endOfLine}`
  } else {
    yield `const __MPX_ctx = __VLS_defineComponent${endOfLine}`
  }
}

function* generateTemplateElements(): Generator<Code> {
  yield `let __VLS_elements!: __VLS_NativeComponents${endOfLine}`
}

function* generateTemplateComponents(): Generator<Code> {
  const types: Code[] = [`typeof __MPX_ctx`]

  yield `type __VLS_LocalComponents =`
  for (const type of types) {
    yield ` & `
    yield type
  }
  yield endOfLine

  yield `let __VLS_components!: __VLS_LocalComponents & __VLS_GlobalComponents${endOfLine}`
}

export function* generateTemplateDirectives(
  _options: ScriptCodegenOptions,
): Generator<Code> {
  const types: Code[] = [`typeof __MPX_ctx`]

  yield `type __VLS_LocalDirectives =`
  for (const type of types) {
    yield ` & `
    yield type
  }
  yield endOfLine

  yield `let __VLS_directives!: __VLS_LocalDirectives & __VLS_GlobalDirectives${endOfLine}`
}

function* generateTemplateBody(
  options: ScriptCodegenOptions,
  templateCodegenCtx: TemplateCodegenContext,
): Generator<Code> {
  yield* generateStyleScopedClasses(options, templateCodegenCtx)
  yield* generateStyleScopedClassReferences(templateCodegenCtx, true)
  yield* generateStyleModules(options)
  yield* generateCssVars(options, templateCodegenCtx)

  if (options.templateCodegen) {
    yield* options.templateCodegen.codes
  } else {
    yield `// no template${newLine}`
    if (!options.scriptSetupRanges?.defineSlots) {
      yield `type __VLS_Slots = {}${endOfLine}`
    }
    yield `type __VLS_InheritedAttrs = {}${endOfLine}`
    yield `type __VLS_TemplateRefs = {}${endOfLine}`
    yield `type __VLS_RootEl = any${endOfLine}`
  }
}

function* generateCssVars(
  options: ScriptCodegenOptions,
  ctx: TemplateCodegenContext,
): Generator<Code> {
  if (!options.sfc.styles.length) {
    return
  }
  yield `// CSS variable injection ${newLine}`
  for (const style of options.sfc.styles) {
    for (const cssBind of style.cssVars) {
      yield* generateInterpolation(
        options,
        ctx,
        style.name,
        codeFeatures.all,
        cssBind.text,
        cssBind.offset,
      )
      yield endOfLine
    }
  }
  yield `// CSS variable injection end ${newLine}`
}

export function getTemplateUsageVars(
  options: ScriptCodegenOptions,
  ctx: ScriptCodegenContext,
) {
  const usageVars = new Set<string>()
  const components = new Set(options.sfc.template?.ast?.components)

  if (options.templateCodegen) {
    // fix import components unused report
    for (const varName of ctx.bindingNames) {
      if (components.has(varName) || components.has(hyphenateTag(varName))) {
        usageVars.add(varName)
      }
    }
    for (const component of components) {
      if (component.includes('.')) {
        usageVars.add(component.split('.')[0])
      }
    }
    for (const [varName] of options.templateCodegen.accessExternalVariables) {
      usageVars.add(varName)
    }
  }

  return usageVars
}
