import type { TemplateCodegenOptions } from './index'
import type { TemplateCodegenContext } from './context'
import type { Code, MpxCodeInformation, MpxCompilerOptions } from '../../types'
import * as CompilerDOM from '@vue/compiler-dom'
import { camelize } from '@mpxjs/language-shared'
import { minimatch } from 'minimatch'
import { toString } from 'muggle-string'
import { codeFeatures } from '../codeFeatures'
import { createTsAst, newLine } from '../utils'
import { wrapWith } from '../utils/wrapWith'
import { generateUnicode } from '../utils/unicode'
import { hyphenateTag } from '../../utils/shared'
import { generateInterpolation } from './interpolation'
import { generateObjectProperty } from './objectProperty'
import { generateModifiers } from './elementDirectives'
import { generateEventArg, generateEventExpression } from './elementEvents'

export interface FailedPropExpression {
  node: CompilerDOM.SimpleExpressionNode
  prefix: string
  suffix: string
}

export function* generateElementProps(
  options: TemplateCodegenOptions,
  ctx: TemplateCodegenContext,
  node: CompilerDOM.ElementNode,
  props: CompilerDOM.ElementNode['props'],
  strictPropsCheck: boolean,
  enableCodeFeatures: boolean,
  failedPropExps?: FailedPropExpression[],
): Generator<Code> {
  const isComponent = node.tagType === CompilerDOM.ElementTypes.COMPONENT

  for (const prop of props) {
    if (prop.type === CompilerDOM.NodeTypes.DIRECTIVE && prop.name === 'on') {
      if (prop.arg?.type === CompilerDOM.NodeTypes.SIMPLE_EXPRESSION) {
        yield `...{ `
        yield* generateEventArg(
          ctx,
          prop.arg.loc.source,
          prop.arg.loc.start.offset,
        )
        yield `: `
        yield* generateEventExpression(options, ctx, prop)
        yield `},`
        yield newLine
      } else if (
        !prop.arg &&
        prop.exp?.type === CompilerDOM.NodeTypes.SIMPLE_EXPRESSION
      ) {
        failedPropExps?.push({ node: prop.exp, prefix: `(`, suffix: `)` })
      }
    }
  }

  for (const prop of props) {
    if (
      prop.type === CompilerDOM.NodeTypes.DIRECTIVE &&
      ((prop.name === 'bind' &&
        prop.arg?.type === CompilerDOM.NodeTypes.SIMPLE_EXPRESSION) ||
        prop.name === 'model') &&
      (!prop.exp || prop.exp.type === CompilerDOM.NodeTypes.SIMPLE_EXPRESSION)
    ) {
      let propName: string | undefined

      if (prop.arg?.type === CompilerDOM.NodeTypes.SIMPLE_EXPRESSION) {
        propName =
          prop.arg.constType === CompilerDOM.ConstantTypes.CAN_STRINGIFY
            ? prop.arg.content
            : prop.arg.loc.source
      } else {
        propName = getModelPropName(node, options.mpxCompilerOptions)
      }

      if (
        propName === undefined ||
        options.mpxCompilerOptions.dataAttributes.some(pattern =>
          minimatch(propName!, pattern),
        )
      ) {
        if (
          prop.exp &&
          prop.exp.constType !== CompilerDOM.ConstantTypes.CAN_STRINGIFY
        ) {
          failedPropExps?.push({ node: prop.exp, prefix: `(`, suffix: `)` })
        }
        continue
      }

      if (
        prop.name === 'bind' &&
        prop.modifiers.some(m => m.content === 'prop' || m.content === 'attr')
      ) {
        propName = propName.slice(1)
      }

      const shouldSpread = propName === 'style' || propName === 'class'
      const shouldCamelize = false
      // isComponent && getShouldCamelize(options, prop, propName)

      if (shouldSpread) {
        yield `...{ `
      }
      const codes = [
        ...wrapWith(
          prop.loc.start.offset,
          prop.loc.end.offset,
          ctx.codeFeatures.verification,
          ...(prop.arg
            ? generateObjectProperty(
                propName,
                prop.arg.loc.start.offset,
                ((prop.loc as any).name_2 ??= {}),
                shouldCamelize,
              )
            : wrapWith(
                prop.loc.start.offset,
                prop.loc.start.offset + 'wx:model'.length,
                ctx.codeFeatures.withoutHighlightAndCompletion,
                propName,
              )),
          `: `,
          ...wrapWith(
            prop.arg?.loc.start.offset ?? prop.loc.start.offset,
            prop.arg?.loc.end.offset ?? prop.loc.end.offset,
            ctx.codeFeatures.verification,
            ...generatePropExp(
              options,
              ctx,
              prop.exp,
              ctx.codeFeatures.all,
              enableCodeFeatures,
            ),
          ),
        ),
      ]
      if (enableCodeFeatures) {
        yield* codes
      } else {
        yield toString(codes)
      }
      if (shouldSpread) {
        yield ` }`
      }
      yield `,${newLine}`

      if (isComponent && prop.name === 'model' && prop.modifiers.length) {
        const propertyName =
          prop.arg?.type === CompilerDOM.NodeTypes.SIMPLE_EXPRESSION
            ? !prop.arg.isStatic
              ? `[__VLS_tryAsConstant(\`$\{${prop.arg.content}\}Modifiers\`)]`
              : camelize(propName) + `Modifiers`
            : `modelModifiers`
        const codes = [...generateModifiers(ctx, prop, propertyName)]
        if (enableCodeFeatures) {
          yield* codes
        } else {
          yield toString(codes)
        }
        yield newLine
      }
    } else if (prop.type === CompilerDOM.NodeTypes.ATTRIBUTE) {
      if (
        options.mpxCompilerOptions.dataAttributes.some(pattern =>
          minimatch(prop.name, pattern),
        )
      ) {
        continue
      }

      const shouldSpread = prop.name === 'style' || prop.name === 'class'
      const shouldCamelize = false
      // isComponent && getShouldCamelize(options, prop, prop.name)
      const codeInfo = getPropsCodeInfo(ctx, strictPropsCheck)

      if (shouldSpread) {
        yield `...{ `
      }
      const codes = [
        ...wrapWith(
          prop.loc.start.offset,
          prop.loc.end.offset,
          ctx.codeFeatures.verification,
          ...generateObjectProperty(
            prop.name,
            prop.loc.start.offset,
            codeInfo,
            shouldCamelize,
          ),
          `: `,
          ...(prop.value
            ? generateAttrValue(options, ctx, prop.value)
            : [`true`]),
        ),
      ]
      if (enableCodeFeatures) {
        yield* codes
      } else {
        yield toString(codes)
      }
      if (shouldSpread) {
        yield ` }`
      }
      yield `,${newLine}`
    } else if (
      prop.type === CompilerDOM.NodeTypes.DIRECTIVE &&
      prop.name === 'bind' &&
      !prop.arg &&
      prop.exp?.type === CompilerDOM.NodeTypes.SIMPLE_EXPRESSION
    ) {
      const codes = [
        ...wrapWith(
          prop.exp.loc.start.offset,
          prop.exp.loc.end.offset,
          ctx.codeFeatures.verification,
          `...`,
          ...generatePropExp(
            options,
            ctx,
            prop.exp,
            ctx.codeFeatures.all,
            enableCodeFeatures,
          ),
        ),
      ]
      if (enableCodeFeatures) {
        yield* codes
      } else {
        yield toString(codes)
      }
      yield `,${newLine}`
    }
  }
}

export function* generatePropExp(
  options: TemplateCodegenOptions,
  ctx: TemplateCodegenContext,
  exp: CompilerDOM.SimpleExpressionNode | undefined,
  features: MpxCodeInformation,
  _enableCodeFeatures: boolean = true,
): Generator<Code> {
  if (exp && exp.constType !== CompilerDOM.ConstantTypes.CAN_STRINGIFY) {
    yield* generateInterpolation(
      options,
      ctx,
      'template',
      features,
      exp.loc.source,
      exp.loc.start.offset,
      exp.loc,
      `(`,
      `)`,
    )
  } else {
    yield `{}`
  }
}

function* generateAttrValue(
  options: TemplateCodegenOptions,
  ctx: TemplateCodegenContext,
  attrNode: CompilerDOM.TextNode,
): Generator<Code> {
  const quote = attrNode.loc.source.startsWith("'") ? "'" : '"'
  let start = attrNode.loc.start.offset
  let content = attrNode.loc.source
  if (
    (content.startsWith('"') && content.endsWith('"')) ||
    (content.startsWith("'") && content.endsWith("'"))
  ) {
    start++
    content = content.slice(1, -1)
  }
  if (isWithDoubleCurly(content)) {
    yield* generateAttrValueWithDoubleCurly(
      options,
      ctx,
      content,
      start,
      attrNode,
    )
  } else {
    yield quote
    yield* generateUnicode(content, start, ctx.codeFeatures.withoutNavigation)
    yield quote
  }
}

function isWithDoubleCurly(content: string): boolean {
  return content.startsWith('{{') && content.endsWith('}}')
}

function* generateAttrValueWithDoubleCurly(
  options: TemplateCodegenOptions,
  ctx: TemplateCodegenContext,
  content: string,
  offset: number,
  attrNode: CompilerDOM.TextNode,
): Generator<Code> {
  let prefix = '('
  let suffix = ')'
  content = content.slice(2, -2)
  offset += 2

  const attrNodeAst: CompilerDOM.SourceLocation = {
    start: {
      ...attrNode.loc.start,
      offset,
    },
    end: attrNode.loc.end,
    source: content,
  }

  const _ast = createTsAst(options.ts, attrNodeAst, content)
  if (
    _ast?.statements?.[0] &&
    options.ts.isLabeledStatement(_ast.statements[0])
  ) {
    prefix = `({`
    suffix = `})`
  }

  yield* generateInterpolation(
    options,
    ctx,
    'template',
    ctx.codeFeatures.all,
    content,
    offset,
    attrNodeAst,
    prefix,
    suffix,
  )
}

// function getShouldCamelize(
//   options: TemplateCodegenOptions,
//   prop: CompilerDOM.AttributeNode | CompilerDOM.DirectiveNode,
//   propName: string,
// ) {
//   return (
//     (prop.type !== CompilerDOM.NodeTypes.DIRECTIVE ||
//       !prop.arg ||
//       (prop.arg?.type === CompilerDOM.NodeTypes.SIMPLE_EXPRESSION &&
//         prop.arg.isStatic)) &&
//     hyphenateAttr(propName) === propName &&
//     !options.mpxCompilerOptions.htmlAttributes.some(pattern =>
//       minimatch(propName, pattern),
//     )
//   )
// }

function getPropsCodeInfo(
  ctx: TemplateCodegenContext,
  strictPropsCheck: boolean,
): MpxCodeInformation {
  return ctx.resolveCodeFeatures({
    ...codeFeatures.withoutHighlightAndCompletion,
    verification: strictPropsCheck || {
      shouldReport(_source, code) {
        // https://typescript.tv/errors/#ts2353
        // https://typescript.tv/errors/#ts2561
        if (String(code) === '2353' || String(code) === '2561') {
          return false
        }
        return true
      },
    },
  })
}

function getModelPropName(
  node: CompilerDOM.ElementNode,
  mpxCompilerOptions: MpxCompilerOptions,
) {
  for (const modelName in mpxCompilerOptions.experimentalModelPropName) {
    const tags = mpxCompilerOptions.experimentalModelPropName[modelName]
    for (const tag in tags) {
      if (node.tag === tag || node.tag === hyphenateTag(tag)) {
        const val = tags[tag]
        if (typeof val === 'object') {
          const arr = Array.isArray(val) ? val : [val]
          for (const attrs of arr) {
            let failed = false
            for (const attr in attrs) {
              const attrNode = node.props.find(
                prop =>
                  prop.type === CompilerDOM.NodeTypes.ATTRIBUTE &&
                  prop.name === attr,
              ) as CompilerDOM.AttributeNode | undefined
              if (!attrNode || attrNode.value?.content !== attrs[attr]) {
                failed = true
                break
              }
            }
            if (!failed) {
              // all match
              return modelName || undefined
            }
          }
        }
      }
    }
  }

  for (const modelName in mpxCompilerOptions.experimentalModelPropName) {
    const tags = mpxCompilerOptions.experimentalModelPropName[modelName]
    for (const tag in tags) {
      if (node.tag === tag || node.tag === hyphenateTag(tag)) {
        const attrs = tags[tag]
        if (attrs === true) {
          return modelName || undefined
        }
      }
    }
  }

  return 'modelValue'
}
