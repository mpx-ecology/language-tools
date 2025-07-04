import type * as ts from 'typescript'
import type { Code, MpxCompilerOptions, Sfc } from '../../types'
import * as CompilerDOM from '@vue/compiler-dom'

import { endOfLine, newLine, wrapWith } from '../utils'
import { getSlotsPropertyName } from '../../utils/shared'
import { generateObjectProperty } from './objectProperty'
import { generateTemplateChild, getWxForNode } from './templateChild'
import { generateStyleScopedClassReferences } from './styleScopedClasses'
import { TemplateCodegenContext, createTemplateCodegenContext } from './context'

export interface TemplateCodegenOptions {
  ts: typeof ts
  compilerOptions: ts.CompilerOptions
  mpxCompilerOptions: MpxCompilerOptions
  template: NonNullable<Sfc['template']>
  scriptSetupBindingNames: Set<string>
  scriptSetupImportComponentNames: Set<string>
  destructuredPropNames: Set<string>
  templateRefNames: Set<string>
  hasDefineSlots?: boolean
  slotsAssignName?: string
  propsAssignName?: string
  selfComponentName?: string
}

export function* generateTemplate(
  options: TemplateCodegenOptions,
): Generator<Code, TemplateCodegenContext> {
  const ctx = createTemplateCodegenContext(options)

  if (options.slotsAssignName) {
    ctx.addLocalVariable(options.slotsAssignName)
  }
  if (options.propsAssignName) {
    ctx.addLocalVariable(options.propsAssignName)
  }

  const slotsPropertyName = getSlotsPropertyName()
  if (options.mpxCompilerOptions.inferTemplateDollarSlots) {
    ctx.dollarVars.add(slotsPropertyName)
  }
  if (options.mpxCompilerOptions.inferTemplateDollarRefs) {
    ctx.dollarVars.add('$refs')
  }

  if (options.template.ast) {
    yield* generateTemplateChild(options, ctx, options.template.ast)
  }

  yield* generateStyleScopedClassReferences(ctx)
  yield* ctx.generateHoistVariables()

  const speicalTypes = [
    [slotsPropertyName, yield* generateSlots(options, ctx)],
    // ['$refs', yield* generateTemplateRefs(ctx)],
    // 内置的一些 $xx 变量（适用于组合式组件）
    ['$t', '(key: string, values?: I18nValues) => string'],
    ['$tc', '(key: string, choice: number, values?: I18nValues) => string'],
    ['$te', '(key: string) => boolean'],
    ['$tm', '(key: string): any'],
  ]

  yield `var __MPX_dollars!: {${newLine}`
  for (const [name, type] of speicalTypes) {
    yield `${name}: ${type}${endOfLine}`
  }
  yield `}${endOfLine}`

  return ctx
}

function* generateSlots(
  options: TemplateCodegenOptions,
  ctx: TemplateCodegenContext,
): Generator<Code> {
  if (!options.hasDefineSlots) {
    yield `type __VLS_Slots = {}`
    for (const { expVar, propsVar } of ctx.dynamicSlots) {
      yield `${newLine}& { [K in NonNullable<typeof ${expVar}>]?: (props: typeof ${propsVar}) => any }`
    }
    for (const slot of ctx.slots) {
      yield `${newLine}& { `
      if (slot.name && slot.offset !== undefined) {
        yield* generateObjectProperty(
          slot.name,
          slot.offset,
          ctx.codeFeatures.withoutHighlightAndCompletion,
          slot.nodeLoc,
        )
      } else {
        yield* wrapWith(
          slot.tagRange[0],
          slot.tagRange[1],
          ctx.codeFeatures.withoutHighlightAndCompletion,
          `default`,
        )
      }
      yield `?: (props: typeof ${slot.propsVar}) => any }`
    }
    yield `${endOfLine}`
  }
  return `__VLS_Slots`
}

// function* generateTemplateRefs(ctx: TemplateCodegenContext): Generator<Code> {
//   yield `type __VLS_TemplateRefs = {}`
//   for (const [name, refs] of ctx.templateRefs) {
//     yield `${newLine}& `
//     if (refs.length >= 2) {
//       yield `(`
//     }
//     for (let i = 0; i < refs.length; i++) {
//       const { typeExp, offset } = refs[i]
//       if (i) {
//         yield ` | `
//       }
//       yield `{ `
//       yield* generateObjectProperty(name, offset, ctx.codeFeatures.navigation)
//       yield `: ${typeExp} }`
//     }
//     if (refs.length >= 2) {
//       yield `)`
//     }
//   }
//   yield endOfLine
//   return `__VLS_TemplateRefs`
// }

export function* forEachElementNode(
  node: CompilerDOM.RootNode | CompilerDOM.TemplateChildNode,
): Generator<CompilerDOM.ElementNode> {
  if (node.type === CompilerDOM.NodeTypes.ROOT) {
    for (const child of node.children) {
      yield* forEachElementNode(child)
    }
  } else if (node.type === CompilerDOM.NodeTypes.ELEMENT) {
    const patchForNode = getWxForNode(node)
    if (patchForNode) {
      yield* forEachElementNode(patchForNode)
    } else {
      yield node
      for (const child of node.children) {
        yield* forEachElementNode(child)
      }
    }
  } else if (node.type === CompilerDOM.NodeTypes.IF) {
    // wx:if / wx:elif / wx:else
    for (let i = 0; i < node.branches.length; i++) {
      const branch = node.branches[i]
      for (const childNode of branch.children) {
        yield* forEachElementNode(childNode)
      }
    }
  } else if (node.type === CompilerDOM.NodeTypes.FOR) {
    // wx:for
    for (const child of node.children) {
      yield* forEachElementNode(child)
    }
  }
}
