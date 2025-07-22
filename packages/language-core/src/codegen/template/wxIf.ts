import type { Code } from '../../types'
import type { TemplateCodegenContext } from './context'
import type { TemplateCodegenOptions } from './index'

import * as CompilerDOM from '@vue/compiler-dom'
import { toString } from 'muggle-string'
import { generateStringLiteralKey, newLine } from '../utils'
import { generateElementChildren } from './elementChildren'
import { generateInterpolation } from './interpolation'

export function* generateWxIf(
  options: TemplateCodegenOptions,
  ctx: TemplateCodegenContext,
  node: CompilerDOM.IfNode,
): Generator<Code> {
  const originalBlockConditionsLength = ctx.blockConditions.length

  for (let i = 0; i < node.branches.length; i++) {
    const branch = node.branches[i]

    if (i === 0) {
      yield `if `
    } else if (branch.condition) {
      yield `else if `
    } else {
      yield `else `
    }

    let addedBlockCondition = false

    if (branch.condition?.type === CompilerDOM.NodeTypes.SIMPLE_EXPRESSION) {
      let codes: Code[]
      if (branch.condition.isStatic) {
        codes = [
          '(',
          ...generateStringLiteralKey(
            branch.condition.content,
            branch.condition.loc.start.offset,
            ctx.codeFeatures.all,
            `"`,
          ),
          ')',
        ]
      } else {
        codes = [
          ...generateInterpolation(
            options,
            ctx,
            'template',
            ctx.codeFeatures.all,
            branch.condition.content,
            branch.condition.loc.start.offset,
            branch.condition.loc,
            `(`,
            `)`,
          ),
        ]
      }
      yield* codes
      ctx.blockConditions.push(toString(codes))
      addedBlockCondition = true
      yield ` `
    }

    yield `{${newLine}`
    yield* generateElementChildren(
      options,
      ctx,
      branch.children,
      isFragment(node),
    )
    yield `}${newLine}`

    if (addedBlockCondition) {
      ctx.blockConditions[ctx.blockConditions.length - 1] =
        `!${ctx.blockConditions[ctx.blockConditions.length - 1]}`
    }
  }

  ctx.blockConditions.length = originalBlockConditionsLength
}

function isFragment(node: CompilerDOM.IfNode) {
  return (
    node.codegenNode &&
    'consequent' in node.codegenNode &&
    'tag' in node.codegenNode.consequent &&
    node.codegenNode.consequent.tag === CompilerDOM.FRAGMENT
  )
}
