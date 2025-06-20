import type { Code, Sfc } from '../../types'
import type { ScriptCodegenContext } from './context'
import type { ScriptSetupRanges } from '../../parsers/scriptSetupRanges'

import { codeFeatures } from '../codeFeatures'
import { generateSfcBlockSection, newLine } from '../utils'

export function* generateEmitsOption(
  scriptSetupRanges: ScriptSetupRanges,
): Generator<Code> {
  const codes: {
    // undefined means the emit source cannot be explained by expression
    optionExp?: Code
    // undefined means the emit source cannot be explained by type
    typeOptionType?: Code
  }[] = []
  if (scriptSetupRanges.defineProp.some(p => p.isModel)) {
    codes.push({
      optionExp: `{} as __VLS_NormalizeEmits<typeof __VLS_modelEmit>`,
      typeOptionType: `__VLS_ModelEmit`,
    })
  }
  if (codes.every(code => code.typeOptionType)) {
    if (codes.length === 1) {
      yield `__typeEmits: {} as `
      yield codes[0].typeOptionType!
      yield `,${newLine}`
    } else if (codes.length >= 2) {
      yield `__typeEmits: {} as `
      yield codes[0].typeOptionType!
      for (let i = 1; i < codes.length; i++) {
        yield ` & `
        yield codes[i].typeOptionType!
      }
      yield `,${newLine}`
    }
  } else if (codes.every(code => code.optionExp)) {
    if (codes.length === 1) {
      yield `emits: `
      yield codes[0].optionExp!
      yield `,${newLine}`
    } else if (codes.length >= 2) {
      yield `emits: {${newLine}`
      for (const code of codes) {
        yield `...`
        yield code.optionExp!
        yield `,${newLine}`
      }
      yield `},${newLine}`
    }
  }
}

export function* generatePropsOption(
  ctx: ScriptCodegenContext,
  scriptSetup: NonNullable<Sfc['scriptSetup']>,
  scriptSetupRanges: ScriptSetupRanges,
): Generator<Code> {
  const codes: {
    optionExp: Code
    // undefined means the prop source cannot be explained by type
    typeOptionExp?: Code
  }[] = []

  if (ctx.generatedPropsType) {
    codes.push({
      optionExp: '{}',
      typeOptionExp: `{} as __VLS_PublicProps`,
    })
  }
  if (scriptSetupRanges.defineProps?.arg) {
    const { arg } = scriptSetupRanges.defineProps
    codes.push({
      optionExp: generateSfcBlockSection(
        scriptSetup,
        arg.start,
        arg.end,
        codeFeatures.navigation,
      ),
      typeOptionExp: undefined,
    })
  }

  const useTypeOption = codes.every(code => code.typeOptionExp)
  const useOption = !useTypeOption || scriptSetupRanges.withDefaults

  if (useTypeOption) {
    if (scriptSetupRanges.withDefaults?.arg) {
      yield `__defaults: __VLS_withDefaultsArg,${newLine}`
    }
    if (codes.length === 1) {
      yield `__typeProps: `
      yield codes[0].typeOptionExp!
      yield `,${newLine}`
    } else if (codes.length >= 2) {
      yield `__typeProps: {${newLine}`
      for (const { typeOptionExp } of codes) {
        yield `...`
        yield typeOptionExp!
        yield `,${newLine}`
      }
      yield `},${newLine}`
    }
  }
  if (useOption) {
    if (codes.length === 1) {
      yield `props: `
      yield codes[0].optionExp
      yield `,${newLine}`
    } else if (codes.length >= 2) {
      yield `props: {${newLine}`
      for (const { optionExp } of codes) {
        yield `...`
        yield optionExp
        yield `,${newLine}`
      }
      yield `},${newLine}`
    }
  }
}
