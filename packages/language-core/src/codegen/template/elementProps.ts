import type { TemplateCodegenOptions } from './index'
import type { TemplateCodegenContext } from './context'
import type { Code, MpxCodeInformation, MpxCompilerOptions } from '../../types'
import * as CompilerDOM from '@vue/compiler-dom'
import { camelize, getAtModeBaseName } from '@mpxjs/language-shared'
import { minimatch } from 'minimatch'
import { toString } from 'muggle-string'
import { codeFeatures } from '../codeFeatures'
import {
  createTsAst,
  endOfLine,
  extractSpacingContentAndPosition,
  generateUnicode,
  mustacheRE,
  mustacheREG,
  newLine,
  wrapWith,
} from '../utils'
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
  const duplicateAtModePropNames = getDuplicateAtModePropNames(props)

  for (const prop of props) {
    if (prop.type === CompilerDOM.NodeTypes.DIRECTIVE && prop.name === 'on') {
      // Component events are checked separately by generateElementEvents().
      // Including them in the component props object as well makes valid Mpx
      // bindings such as catchtap look like unknown component props once the
      // component's exact props type is available. Native elements do not use
      // generateElementEvents(), so keep their event attributes here.
      if (isComponent) {
        continue
      }
      if (prop.arg?.type === CompilerDOM.NodeTypes.SIMPLE_EXPRESSION) {
        // ...{} 解构后会丢失 bindxx 属性类型检查报错时的属性定位
        // yield `...{ `
        yield* generateEventArg(
          ctx,
          prop.arg.loc.source,
          prop.arg.loc.start.offset,
        )
        yield `: `
        yield* generateEventExpression(options, ctx, prop)
        yield `,${newLine}`
        // yield `},`
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

      if (propName === undefined) {
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

      propName = getAtModeBaseName(propName)

      if (
        options.mpxCompilerOptions.dataAttributes.some(pattern =>
          minimatch(propName, pattern),
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
          ...(shouldSpread
            ? generateAttrValueForStyleOrClass(options, ctx, prop, propName)
            : wrapWith(
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
              )),
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
      const propName = getAtModeBaseName(prop.name)

      if (
        options.mpxCompilerOptions.dataAttributes.some(pattern =>
          minimatch(propName, pattern),
        )
      ) {
        continue
      }

      if (
        node.tag === 'component' &&
        propName === 'range' &&
        prop.value?.content.trim()
      ) {
        const content = prop.value.content
        const quotes =
          prop.value.loc.source.startsWith('"') ||
          prop.value.loc.source.startsWith("'")
        const contentArr = content.split(',')
        let offset = prop.value.loc.start.offset + (quotes ? 1 : 0) // +1 for the quote

        for (const tag of contentArr) {
          const extracted = extractSpacingContentAndPosition(tag)
          if (extracted?.content.trim()) {
            ctx.templateNodeTags.push({
              name: extracted.content,
              startTagOffset: offset + extracted.start,
            })
          }
          offset += tag.length + 1 // +1 for the comma
        }
      }

      const shouldSpread = propName === 'style' || propName === 'class'
      const shouldCamelize = false
      // isComponent && getShouldCamelize(options, prop, prop.name)
      const codeInfo = getPropsCodeInfo(
        ctx,
        strictPropsCheck,
        (options.usingComponents?.get(node.tag)?.length ?? 0) > 1,
        duplicateAtModePropNames.has(propName),
      )

      if (shouldSpread) {
        yield `...{ `
      }
      const codes = [
        ...wrapWith(
          prop.loc.start.offset,
          prop.loc.end.offset,
          ctx.codeFeatures.verification,
          ...generateObjectProperty(
            propName,
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

/**
 * The main props object checks the last occurrence of each normalized key.
 * Validate earlier at-mode variants separately so every platform value is
 * checked without changing required-prop behavior for the component call.
 */
export function* generateAtModePropChecks(
  options: TemplateCodegenOptions,
  ctx: TemplateCodegenContext,
  node: CompilerDOM.ElementNode,
  props: CompilerDOM.ElementNode['props'],
  componentOriginalVar: string,
  strictPropsCheck: boolean,
): Generator<Code> {
  const groups = getAtModePropGroups(props)

  for (const [propName, group] of groups) {
    if (group.length < 2) {
      continue
    }

    // The final occurrence is already checked by the component call's props
    // object. Only validate values that TypeScript considers overwritten.
    for (const prop of group.slice(0, -1)) {
      const codeInfo = getPropsCodeInfo(
        ctx,
        strictPropsCheck,
        (options.usingComponents?.get(node.tag)?.length ?? 0) > 1,
        false,
      )

      const valueCodes = prop.value
        ? [...generateAttrValue(options, ctx, prop.value)]
        : ([`true`] satisfies Code[])

      yield `new ${componentOriginalVar}({${newLine}`
      yield `...({} as ConstructorParameters<typeof ${componentOriginalVar}>[0]),${newLine}`
      yield* generateObjectProperty(propName, prop.loc.start.offset, codeInfo)
      yield `: `
      if (prop.value) {
        yield* wrapWith(
          prop.value.loc.start.offset,
          prop.value.loc.end.offset,
          ctx.codeFeatures.verification,
          toString(valueCodes),
        )
      } else {
        yield `true`
      }
      yield `,${newLine}})${endOfLine}`
    }
  }
}

function getDuplicateAtModePropNames(props: CompilerDOM.ElementNode['props']) {
  return new Set(
    [...getAtModePropGroups(props)]
      .filter(([, group]) => group.length > 1)
      .map(([name]) => name),
  )
}

function getAtModePropGroups(props: CompilerDOM.ElementNode['props']) {
  const groups = new Map<string, CompilerDOM.AttributeNode[]>()
  const atModeNames = new Set<string>()

  for (const prop of props) {
    if (prop.type !== CompilerDOM.NodeTypes.ATTRIBUTE) {
      continue
    }
    const propName = getAtModeBaseName(prop.name)
    if (propName !== prop.name) {
      atModeNames.add(propName)
    }
    let group = groups.get(propName)
    if (!group) {
      group = []
      groups.set(propName, group)
    }
    group.push(prop)
  }

  for (const propName of groups.keys()) {
    if (!atModeNames.has(propName)) {
      groups.delete(propName)
    }
  }

  return groups
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

function* generateAttrValueForStyleOrClass(
  options: TemplateCodegenOptions,
  ctx: TemplateCodegenContext,
  attrNode: CompilerDOM.DirectiveNode,
  propName: string,
) {
  const adjustedNode = {
    ...attrNode,
    loc: {
      ...attrNode.loc,
      source: attrNode.loc.source.slice(`${propName}=`.length),
      start: {
        ...attrNode.loc.start,
        offset: attrNode.loc.start.offset + `${propName}=`.length,
      },
    },
  }
  yield* generateAttrValue(options, ctx, adjustedNode)
}

function* generateAttrValue(
  options: TemplateCodegenOptions,
  ctx: TemplateCodegenContext,
  attrNode: CompilerDOM.TextNode | CompilerDOM.DirectiveNode,
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
  if (mustacheRE.test(content)) {
    yield `(`
    yield* generateWithMustache(options, ctx, content, start, attrNode, quote)
    yield `)`
  } else {
    yield quote
    yield* generateUnicode(content, start, ctx.codeFeatures.withoutNavigation)
    yield quote
  }
}

function* generateWithMustache(
  options: TemplateCodegenOptions,
  ctx: TemplateCodegenContext,
  content: string,
  offset: number,
  attrNode: CompilerDOM.TextNode | CompilerDOM.DirectiveNode,
  quote: `'` | `"`,
): Generator<Code> {
  let match: RegExpExecArray | null
  let lastLastIndex = 0
  let shouldPlusBeforeExp = false

  function* generateSingleStr(content: string): Generator<Code> {
    if (lastLastIndex !== 0) {
      yield ` + `
    }
    yield quote
    yield [content, 'template', offset + lastLastIndex, ctx.codeFeatures.all]
    yield quote
  }

  while ((match = mustacheREG.exec(content))) {
    const pre = content.substring(lastLastIndex, match.index)
    // for pre string
    if (pre.length) {
      yield* generateSingleStr(pre)
      shouldPlusBeforeExp = true
    }
    // for exp: {{ xxx }}
    const exp = match[1]
    if (exp.length) {
      if (shouldPlusBeforeExp) {
        yield ` + `
      }
      yield* generateSingleMustache(
        options,
        ctx,
        exp,
        offset + match.index + 2,
        attrNode,
      )
      shouldPlusBeforeExp = true
    }
    lastLastIndex = mustacheREG.lastIndex
  }

  // for tail str
  const tail = content.substring(lastLastIndex)
  if (tail.length) {
    yield* generateSingleStr(tail)
  }
}

export function* generateSingleMustache(
  options: TemplateCodegenOptions,
  ctx: TemplateCodegenContext,
  content: string,
  offset: number,
  attrNode: CompilerDOM.TextNode | CompilerDOM.DirectiveNode,
): Generator<Code> {
  let prefix = '('
  let suffix = ')'

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

function getPropsCodeInfo(
  ctx: TemplateCodegenContext,
  strictPropsCheck: boolean,
  hasMultipleComponentCandidates: boolean,
  suppressDuplicateAtModeProp: boolean,
): MpxCodeInformation {
  return ctx.resolveCodeFeatures({
    // HTML custom data always owns prop completion so it can insert `name=""`.
    // Keep TypeScript's richer native hover for a single component candidate,
    // but disable it for multi-path components because QuickInfo only shows
    // one branch; their merged union hover is provided by the HTML service.
    ...(hasMultipleComponentCandidates
      ? codeFeatures.navigationAndVerification
      : codeFeatures.withoutHighlightAndCompletion),
    verification: {
      shouldReport(_source, code) {
        // Multiple conditional variants of one prop are valid because Mpx only
        // keeps the branch for the active platform. Earlier values are checked
        // separately by generateAtModePropChecks(); suppress only TypeScript's
        // duplicate-key diagnostic in the main props object.
        if (suppressDuplicateAtModeProp && String(code) === '1117') {
          return false
        }
        // https://typescript.tv/errors/#ts2353
        // https://typescript.tv/errors/#ts2561
        if (
          !strictPropsCheck &&
          (String(code) === '2353' || String(code) === '2561')
        ) {
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
