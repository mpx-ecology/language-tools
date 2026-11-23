import type { TemplateCodegenOptions } from './index'
import type { Code, MpxCodeInformation } from '../../types'

import * as CompilerDOM from '@vue/compiler-dom'

import { hyphenateTag } from '../../utils/shared'
import { codeFeatures } from '../codeFeatures'
import {
  endOfLine,
  identifierRegex,
  newLine,
  normalizeAttributeValue,
} from '../utils'
import { wrapWith } from '../utils/wrapWith'
import type { TemplateCodegenContext } from './context'
import { generateElementChildren } from './elementChildren'
import { generateElementDirectives } from './elementDirectives'
import { generateElementEvents } from './elementEvents'
import {
  type FailedPropExpression,
  generateAtModePropChecks,
  generateElementProps,
} from './elementProps'
import { generateInterpolation } from './interpolation'
import { generatePropertyAccess } from './propertyAccess'
import { generateVSlot } from './vSlot'
import {
  type TemplateTagIdentity,
  getTemplateTagIdentities,
} from './tagIdentity'

export function* generateComponent(
  options: TemplateCodegenOptions,
  ctx: TemplateCodegenContext,
  node: CompilerDOM.ElementNode,
  identity: TemplateTagIdentity = getTemplateTagIdentities(node)[0],
  rnOnly = false,
): Generator<Code> {
  const tagOffsets = [identity.startTagOffset]
  if (identity.endTagOffset !== undefined)
    tagOffsets.push(identity.endTagOffset)
  const failedPropExps: FailedPropExpression[] = []
  const componentOriginalVar = ctx.getInternalVariable()
  const componentFunctionalVar = ctx.getInternalVariable()
  const componentVNodeVar = ctx.getInternalVariable()
  const componentCtxVar = ctx.getInternalVariable()
  const isComponentTag = node.tag.toLowerCase() === 'component'
  const rnTemplate = rnOnly || options.rnTemplate === true

  ctx.templateNodeTags.push(identity)

  ctx.currentComponent?.childTypes.push(`typeof ${componentVNodeVar}`)
  ctx.currentComponent = {
    ctxVar: componentCtxVar,
    childTypes: [],
    used: false,
  }

  let props = node.props
  let dynamicTagInfo:
    | {
        tag: string
        offsets: number[]
        astHolder: CompilerDOM.SourceLocation
      }
    | undefined

  if (isComponentTag) {
    for (const prop of node.props) {
      if (
        prop.type === CompilerDOM.NodeTypes.DIRECTIVE &&
        prop.name === 'bind' &&
        prop.arg?.loc.source === 'is' &&
        prop.exp?.type === CompilerDOM.NodeTypes.SIMPLE_EXPRESSION
      ) {
        dynamicTagInfo = {
          tag: prop.exp.content,
          offsets: [prop.exp.loc.start.offset],
          astHolder: prop.exp.loc,
        }
        props = props.filter(p => p !== prop)
        break
      }
    }
  } else if (node.tag.includes('.')) {
    // namespace tag
    dynamicTagInfo = {
      tag: node.tag,
      offsets: tagOffsets,
      astHolder: node.loc,
    }
  }

  if (dynamicTagInfo) {
    yield `const ${componentOriginalVar} = (`
    yield* generateInterpolation(
      options,
      ctx,
      'template',
      ctx.codeFeatures.all,
      dynamicTagInfo.tag,
      dynamicTagInfo.offsets[0],
      dynamicTagInfo.astHolder,
      `(`,
      `)`,
    )
    if (dynamicTagInfo.offsets[1] !== undefined) {
      yield `,`
      yield* generateInterpolation(
        options,
        ctx,
        'template',
        ctx.codeFeatures.withoutCompletion,
        dynamicTagInfo.tag,
        dynamicTagInfo.offsets[1],
        dynamicTagInfo.astHolder,
        `(`,
        `)`,
      )
    }
    yield `)${endOfLine}`
  } else if (!isComponentTag) {
    yield `const ${componentOriginalVar} = ({} as __VLS_WithComponent<${JSON.stringify(node.tag)}, __VLS_LocalComponents, `
    if (options.selfComponentName === node.tag) {
      yield `typeof __VLS_self`
    } else {
      yield `void`
    }
    yield `>)`
    yield* generatePropertyAccess(
      options,
      ctx,
      node.tag,
      tagOffsets[0],
      identity.sourceTag
        ? ctx.resolveCodeFeatures({ verification: true, semantic: true })
        : ctx.codeFeatures.withoutHighlightAndCompletionAndNavigation,
    )
    yield `${endOfLine}`

    // Navigation uses the same raw property as type checking and highlighting.
    yield `/** @type {[`
    for (const tagOffset of tagOffsets) {
      yield `typeof __VLS_components`
      yield* generatePropertyAccess(
        options,
        ctx,
        node.tag,
        tagOffset,
        codeFeatures.navigation,
      )
      yield `, `
    }
    yield `]} */${endOfLine}`

    if (identifierRegex.test(node.tag)) {
      // auto import support
      yield `// @ts-ignore${newLine}`
      yield [
        node.tag,
        'template',
        tagOffsets[0],
        {
          completion: {
            isAdditional: true,
            onlyImport: true,
          },
        },
      ]
      yield `${endOfLine}`
    }
  } else {
    yield `const ${componentOriginalVar} = {} as any${endOfLine}`
  }

  yield `// @ts-ignore${newLine}`
  yield `const ${componentFunctionalVar} = __VLS_asFunctionalComponent(${componentOriginalVar}, new ${componentOriginalVar}({${newLine}`
  yield* generateElementProps(
    options,
    ctx,
    node,
    props,
    options.mpxCompilerOptions.checkUnknownProps,
    false,
    undefined,
    rnTemplate,
  )
  yield `}))${endOfLine}`

  yield* generateAtModePropChecks(
    options,
    ctx,
    node,
    props,
    componentOriginalVar,
    options.mpxCompilerOptions.checkUnknownProps,
    rnTemplate,
  )

  yield `const `
  yield* wrapWith(
    node.loc.start.offset,
    node.loc.end.offset,
    ctx.resolveCodeFeatures({
      verification: {
        shouldReport(_source, code) {
          // https://typescript.tv/errors/#ts6133
          return String(code) !== '6133'
        },
      },
    }),
    componentVNodeVar,
  )
  yield ` = ${componentFunctionalVar}`
  yield `(`
  yield* wrapWith(
    tagOffsets[0],
    tagOffsets[0] + node.tag.length,
    ctx.codeFeatures.verification,
    `{${newLine}`,
    ...generateElementProps(
      options,
      ctx,
      node,
      props,
      options.mpxCompilerOptions.checkUnknownProps,
      true,
      failedPropExps,
      rnTemplate,
    ),
    `}`,
  )
  yield `, ...__VLS_functionalComponentArgsRest(${componentFunctionalVar}))${endOfLine}`

  yield* generateFailedPropExps(options, ctx, failedPropExps)
  yield* generateElementEvents(
    options,
    ctx,
    node,
    componentOriginalVar,
    componentFunctionalVar,
    componentVNodeVar,
    componentCtxVar,
  )
  yield* generateElementDirectives(options, ctx, node)

  const [refName, offset] = yield* generateElementReference(options, ctx, node)
  const tag = hyphenateTag(node.tag)
  const isRootNode =
    ctx.singleRootNodes.has(node) &&
    !options.mpxCompilerOptions.fallthroughComponentNames.includes(tag)

  if (refName || isRootNode) {
    const componentInstanceVar = ctx.getInternalVariable()
    ctx.currentComponent.used = true

    yield `var ${componentInstanceVar} = {} as (Parameters<NonNullable<typeof ${componentCtxVar}['expose']>>[0] | null)`
    if (ctx.inWxFor) {
      yield `[]`
    }
    yield `${endOfLine}`

    if (refName && offset) {
      ctx.addTemplateRef(
        refName,
        `typeof ${ctx.getHoistVariable(componentInstanceVar)}`,
        offset,
      )
    }
    if (isRootNode) {
      ctx.singleRootElTypes.push(
        `NonNullable<typeof ${componentInstanceVar}>['$el']`,
      )
    }
  }

  const slotDir = node.props.find(
    p => p.type === CompilerDOM.NodeTypes.DIRECTIVE && p.name === 'slot',
  ) as CompilerDOM.DirectiveNode
  yield* generateVSlot(options, ctx, node, slotDir)

  if (ctx.currentComponent.used) {
    yield `var ${componentCtxVar}!: __VLS_FunctionalComponentCtx<typeof ${componentOriginalVar}, typeof ${componentVNodeVar}>${endOfLine}`
  }
}

export function* generateElement(
  options: TemplateCodegenOptions,
  ctx: TemplateCodegenContext,
  node: CompilerDOM.ElementNode,
  identity: TemplateTagIdentity = getTemplateTagIdentities(node)[0],
): Generator<Code> {
  const { startTagOffset, endTagOffset } = identity
  const failedPropExps: FailedPropExpression[] = []
  const isExternalNodeTag = options.usingComponents?.has(node.tag) ?? false

  ctx.currentComponent?.childTypes.push(
    `__VLS_NativeElements['${isExternalNodeTag ? 'external-' : ''}${node.tag}']`,
  )

  ctx.templateNodeTags.push(identity)

  yield `__VLS_asFunctionalElement(__VLS_elements`
  yield* generateElementNodeTag(
    options,
    ctx,
    node.tag,
    startTagOffset,
    identity.sourceTag
      ? ctx.resolveCodeFeatures({
          verification: true,
          semantic: true,
          navigation: true,
        })
      : ctx.codeFeatures.withoutHighlightAndCompletion,
    isExternalNodeTag,
  )
  if (endTagOffset !== undefined) {
    yield `, __VLS_elements`
    yield* generateElementNodeTag(
      options,
      ctx,
      node.tag,
      endTagOffset,
      ctx.codeFeatures.withoutHighlightAndCompletion,
      isExternalNodeTag,
    )
  }
  yield `)(`
  yield* wrapWith(
    startTagOffset,
    startTagOffset + node.tag.length,
    ctx.codeFeatures.verification,
    `{${newLine}`,
    ...generateElementProps(
      options,
      ctx,
      node,
      node.props,
      options.mpxCompilerOptions.checkUnknownProps,
      true,
      failedPropExps,
    ),
    `}`,
  )
  yield `)${endOfLine}`

  yield* generateFailedPropExps(options, ctx, failedPropExps)
  yield* generateElementDirectives(options, ctx, node)

  const [refName, offset] = yield* generateElementReference(options, ctx, node)
  if (refName && offset) {
    let typeExp = `__VLS_NativeElements['${isExternalNodeTag ? 'external-' : ''}${node.tag}']`
    if (ctx.inWxFor) {
      typeExp += `[]`
    }
    ctx.addTemplateRef(refName, typeExp, offset)
  }
  if (ctx.singleRootNodes.has(node)) {
    ctx.singleRootElTypes.push(
      `__VLS_NativeElements['${isExternalNodeTag ? 'external-' : ''}${node.tag}']`,
    )
  }

  const { currentComponent } = ctx
  ctx.currentComponent = undefined
  yield* generateElementChildren(options, ctx, node.children)
  ctx.currentComponent = currentComponent
}

function* generateElementNodeTag(
  options: TemplateCodegenOptions,
  ctx: TemplateCodegenContext,
  code: string,
  offset: number,
  features: MpxCodeInformation,
  isExternalNodeTag = false,
): Generator<Code> {
  if (isExternalNodeTag) {
    // 外部引用组件，可能会覆盖同名原生组件
    // eg: <map> -> __VLS_elements['external-map']
    yield `['external-`
    yield [code, 'template', offset, features]
    yield `']`
  } else {
    // 内置原生组件 eg: <map> -> __VLS_elements.map
    yield* generatePropertyAccess(options, ctx, code, offset, features)
  }
}

function* generateFailedPropExps(
  options: TemplateCodegenOptions,
  ctx: TemplateCodegenContext,
  failedPropExps: FailedPropExpression[],
): Generator<Code> {
  for (const failedExp of failedPropExps) {
    yield* generateInterpolation(
      options,
      ctx,
      'template',
      ctx.codeFeatures.all,
      failedExp.node.loc.source,
      failedExp.node.loc.start.offset,
      failedExp.node.loc,
      failedExp.prefix,
      failedExp.suffix,
    )
    yield endOfLine
  }
}

function* generateElementReference(
  options: TemplateCodegenOptions,
  ctx: TemplateCodegenContext,
  node: CompilerDOM.ElementNode,
): Generator<Code, [refName: string, offset: number] | []> {
  for (const prop of node.props) {
    if (
      prop.type === CompilerDOM.NodeTypes.ATTRIBUTE &&
      prop.name === 'ref' &&
      prop.value
    ) {
      const [content, startOffset] = normalizeAttributeValue(prop.value)

      // navigation support for `const foo = ref()`
      yield `/** @type {typeof __MPX_ctx`
      yield* generatePropertyAccess(
        options,
        ctx,
        content,
        startOffset,
        ctx.codeFeatures.navigation,
        prop.value.loc,
      )
      yield `} */${endOfLine}`

      if (
        identifierRegex.test(content) &&
        !options.templateRefNames.has(content)
      ) {
        ctx.accessExternalVariable(content, startOffset)
      }

      return [content, startOffset]
    }
  }
  return []
}
