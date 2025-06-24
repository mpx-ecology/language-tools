import type { Code } from '../../types'
import type { TemplateCodegenContext } from './context'
import type { TemplateCodegenOptions } from './index'

import * as CompilerDOM from '@vue/compiler-dom'
import { generateInterpolation } from './interpolation'
import { generateElementChildren } from './elementChildren'
import { collectVars, createTsAst, endOfLine, newLine } from '../utils'

export function* generateWxFor(
  options: TemplateCodegenOptions,
  ctx: TemplateCodegenContext,
  node: CompilerDOM.ForNode,
): Generator<Code> {
  const { leftExpressionRange, leftExpressionText } = parseWxForNode(node)
  const { index, value, source, mpx, defaultIndex, defaultValue } =
    node.parseResult
  const forBlockVars: string[] = []

  const collectVar = () => {
    const collectAst = createTsAst(
      options.ts,
      node.parseResult,
      `const [${leftExpressionText}]`,
    )
    collectVars(options.ts, collectAst, collectAst, forBlockVars)
  }

  yield `for (const [`
  if (leftExpressionRange && leftExpressionText && !mpx) {
    collectVar()
    yield [
      leftExpressionText,
      'template',
      leftExpressionRange.start,
      ctx.codeFeatures.all,
    ]
  } else {
    collectVar()
    yield [
      value!.loc.source,
      'template',
      value!.loc.start.offset,
      defaultValue ? ctx.codeFeatures.none : ctx.codeFeatures.all,
    ]
    yield ','
    yield [
      index!.loc.source,
      'template',
      index!.loc.start.offset,
      defaultIndex ? ctx.codeFeatures.none : ctx.codeFeatures.all,
    ]
  }
  yield `] of `
  if (source.type === CompilerDOM.NodeTypes.SIMPLE_EXPRESSION) {
    yield `__VLS_getWxForSourceType(`
    yield* generateInterpolation(
      options,
      ctx,
      'template',
      ctx.codeFeatures.all,
      source.content,
      source.loc.start.offset,
      source.loc,
      `(`,
      `)`,
    )
    yield `!)`
  } else {
    yield `{} as any`
  }
  yield `) {${newLine}`

  for (const varName of forBlockVars) {
    ctx.addLocalVariable(varName)
  }

  let isFragment = true
  for (const argument of node.codegenNode?.children.arguments ?? []) {
    if (
      argument.type === CompilerDOM.NodeTypes.JS_FUNCTION_EXPRESSION &&
      argument.returns?.type === CompilerDOM.NodeTypes.VNODE_CALL &&
      argument.returns?.props?.type ===
        CompilerDOM.NodeTypes.JS_OBJECT_EXPRESSION
    ) {
      if (argument.returns.tag !== CompilerDOM.FRAGMENT) {
        isFragment = false
        continue
      }
      for (const prop of argument.returns.props.properties) {
        if (
          prop.value.type === CompilerDOM.NodeTypes.SIMPLE_EXPRESSION &&
          !prop.value.isStatic
        ) {
          yield* generateInterpolation(
            options,
            ctx,
            'template',
            ctx.codeFeatures.all,
            prop.value.content,
            prop.value.loc.start.offset,
            prop.value.loc,
            `(`,
            `)`,
          )
          yield endOfLine
        }
      }
    }
  }

  const { inWxFor } = ctx
  ctx.inWxFor = true
  yield* generateElementChildren(options, ctx, node.children, isFragment)
  ctx.inWxFor = inWxFor

  for (const varName of forBlockVars) {
    ctx.removeLocalVariable(varName)
  }
  yield `}${newLine}`
}

export function parseWxForNode(node: CompilerDOM.ForNode) {
  const { value, key, index, mpx, source } = node.parseResult

  const leftExpressionRange =
    value || key || index
      ? {
          start: (value ?? key ?? index)!.loc.start.offset,
          end: (index ?? key ?? value)!.loc.end.offset,
        }
      : undefined

  if (mpx) {
    return {
      leftExpressionRange: {
        start: source.loc.start.offset,
        end: source.loc.end.offset,
      },
      leftExpressionText: `${value?.loc.source ?? 'item'}, ${index?.loc.source ?? 'index'}`,
      mpx: node.parseResult.mpx,
    }
  }

  const leftExpressionText = leftExpressionRange
    ? mpx
      ? value?.loc.source || 'item'
      : node.loc.source.slice(
          leftExpressionRange.start - node.loc.start.offset,
          leftExpressionRange.end - node.loc.start.offset,
        )
    : node.parseResult.mpx
      ? 'item'
      : undefined
  return {
    leftExpressionRange: leftExpressionRange ?? { start: 0, end: 0 },
    leftExpressionText,
    mpx: node.parseResult.mpx,
  }
}
