import type { Code } from '../../types'
import type { TemplateCodegenContext } from './context'
import type { TemplateCodegenOptions } from './index'

import * as CompilerDOM from '@vue/compiler-dom'
import { generateTemplateChild } from './templateChild'

export function* generateElementChildren(
  options: TemplateCodegenOptions,
  ctx: TemplateCodegenContext,
  children: (
    | CompilerDOM.TemplateChildNode
    | CompilerDOM.SimpleExpressionNode
  )[],
  enterNode = true,
): Generator<Code> {
  yield* ctx.generateAutoImportCompletion()
  for (const childNode of children) {
    if (isTemplateImport(childNode)) {
      continue
    }
    yield* generateTemplateChild(options, ctx, childNode, enterNode)
  }
  yield* ctx.generateAutoImportCompletion()
}

function isTemplateImport(
  node: CompilerDOM.TemplateChildNode | CompilerDOM.SimpleExpressionNode,
) {
  if (node.type === CompilerDOM.NodeTypes.ELEMENT) {
    const { tag, props } = node
    if (
      tag === 'template' &&
      props.some(prop => ['name', 'is'].includes(prop.name))
    ) {
      return true
    }
  }
  return false
}
