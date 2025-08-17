import type * as ts from 'typescript'
import type { ScriptRanges } from '../../parsers/scriptRanges'
import type { ScriptSetupRanges } from '../../parsers/scriptSetupRanges'
import type { Code, MpxCompilerOptions, Sfc } from '../../types'
import type { TemplateCodegenContext } from '../template/context'

import * as path from 'path-browserify'
import { generateSrc } from './src'
import { generateTemplate } from './template'
import { codeFeatures } from '../codeFeatures'
import { generateComponentSelf } from './componentSelf'
import {
  endOfLine,
  generateDefineComponent,
  generateSfcBlockSection,
  newLine,
} from '../utils'
import { generateGlobalTypes, getGlobalTypesFileName } from '../globalTypes'
import { ScriptCodegenContext, createScriptCodegenContext } from './context'
import { generateScriptSetup, generateScriptSetupImports } from './scriptSetup'
// import { generateJsonUsingComponents } from './jsonUsingComponents'

export interface ScriptCodegenOptions {
  ts: typeof ts
  compilerOptions: ts.CompilerOptions
  mpxCompilerOptions: MpxCompilerOptions
  sfc: Sfc
  fileName: string
  lang: string
  scriptRanges: ScriptRanges | undefined
  scriptSetupRanges: ScriptSetupRanges | undefined
  templateCodegen: (TemplateCodegenContext & { codes: Code[] }) | undefined
  destructuredPropNames: Set<string>
  templateRefNames: Set<string>
  appendGlobalTypes: boolean
}

const OptionsComponentCtor = {
  Component: 'DefineComponent',
  Page: 'DefinePage',
} as const

export function* generateScript(
  options: ScriptCodegenOptions,
): Generator<Code, ScriptCodegenContext> {
  const ctx = createScriptCodegenContext(options)

  if (options.mpxCompilerOptions.__setupedGlobalTypes) {
    const globalTypes = options.mpxCompilerOptions.__setupedGlobalTypes
    if (typeof globalTypes === 'object') {
      let relativePath = path.relative(
        path.dirname(options.fileName),
        globalTypes.absolutePath,
      )
      if (
        relativePath !== globalTypes.absolutePath &&
        !relativePath.startsWith('./') &&
        !relativePath.startsWith('../')
      ) {
        relativePath = './' + relativePath
      }
      yield `/// <reference path="${relativePath}" />${newLine}`
    } else {
      yield `/// <reference path=".mpx-global-types/${getGlobalTypesFileName(options.mpxCompilerOptions)}" />${newLine}`
    }
  } else {
    yield `/* mpx_reference_placeholder */${newLine}`
  }

  yield `/// <reference types="miniprogram-api-typings" />${newLine}`

  if (options.sfc.script?.src) {
    yield* generateSrc(options.sfc.script.src)
  }
  if (options.sfc.scriptSetup && options.scriptSetupRanges) {
    yield* generateScriptSetupImports(
      options.sfc.scriptSetup,
      options.scriptSetupRanges,
    )
  }
  if (options.sfc.script && options.scriptRanges) {
    const { createComponentObj } = options.scriptRanges
    const isCreateComponentRawObject =
      createComponentObj &&
      options.sfc.script.content[createComponentObj.expression.start] === '{'
    if (options.sfc.scriptSetup && options.scriptSetupRanges) {
      if (createComponentObj) {
        yield generateSfcBlockSection(
          options.sfc.script,
          0,
          createComponentObj.expression.start,
          codeFeatures.all,
        )
        yield* generateScriptSetup(
          options,
          ctx,
          options.sfc.scriptSetup,
          options.scriptSetupRanges,
        )
        yield generateSfcBlockSection(
          options.sfc.script,
          createComponentObj.expression.end,
          options.sfc.script.content.length,
          codeFeatures.all,
        )
      } else {
        yield generateSfcBlockSection(
          options.sfc.script,
          0,
          options.sfc.script.content.length,
          codeFeatures.all,
        )
        yield* generateScriptSectionPartiallyEnding(
          options.sfc.script.name,
          options.sfc.script.content.length,
          '#3632/both',
        )
        yield* generateScriptSetup(
          options,
          ctx,
          options.sfc.scriptSetup,
          options.scriptSetupRanges,
        )
      }
    } else if (createComponentObj && isCreateComponentRawObject) {
      // raw script
      yield generateSfcBlockSection(
        options.sfc.script,
        0,
        options.sfc.script.content.length,
        codeFeatures.all,
      )
      // defineComponent
      yield `const __VLS_defineComponent = ${OptionsComponentCtor[createComponentObj.ctor]}(`
      yield* generateDefineComponent(
        options.sfc.script,
        createComponentObj.expression.start,
        createComponentObj.expression.end,
        {
          ...codeFeatures.all,
          verification: false, // 避免重复报错
        },
      )
      yield `)${endOfLine}`
    } else {
      yield generateSfcBlockSection(
        options.sfc.script,
        0,
        options.sfc.script.content.length,
        codeFeatures.all,
      )
      yield* generateScriptSectionPartiallyEnding(
        options.sfc.script.name,
        options.sfc.script.content.length,
        '#3632/script',
      )
    }
  } else if (options.sfc.scriptSetup && options.scriptSetupRanges) {
    yield* generateScriptSetup(
      options,
      ctx,
      options.sfc.scriptSetup,
      options.scriptSetupRanges,
    )
  }

  if (options.sfc.scriptSetup) {
    yield* generateScriptSectionPartiallyEnding(
      options.sfc.scriptSetup.name,
      options.sfc.scriptSetup.content.length,
      '#4569/main',
      ';',
    )
  }

  if (!ctx.generatedTemplate) {
    yield* generateTemplate(options, ctx)
    yield* generateComponentSelf(options)
    // yield* generateJsonUsingComponents(options, ctx)
  }

  yield* ctx.localTypes.generate([...ctx.localTypes.getUsedNames()])
  if (options.appendGlobalTypes) {
    yield generateGlobalTypes(options.mpxCompilerOptions)
  }

  if (options.sfc.scriptSetup) {
    yield [
      '',
      'scriptSetup',
      options.sfc.scriptSetup.content.length,
      codeFeatures.verification,
    ]
  }

  return ctx
}

/**
 * 用 debuggger 作为 script 部分的默认分隔符
 * 可以正常拦截非正常结束部分的报错
 * eg:
 * <script>
 * const a =
 *       ^ Expression expected.ts-plugin(1109)
 * </script>
 */
export function* generateScriptSectionPartiallyEnding(
  source: string,
  end: number,
  mark: string,
  delimiter = 'debugger',
): Generator<Code> {
  yield delimiter
  yield ['', source, end, codeFeatures.verification]
  yield `/* PartiallyEnd: ${mark} */${newLine}`
}
