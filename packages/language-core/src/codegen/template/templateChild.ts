import type { Code } from '../../types'
import type { TemplateCodegenOptions } from './index'
import type { TemplateCodegenContext } from './context'

import * as CompilerDOM from '@vue/compiler-dom'
import { appendCode, endOfLine } from '../utils'
import { nativeComponentNames } from '../globalTypes/nativeComponentsTypes'
import { collectStyleScopedClassReferences } from './styleScopedClasses'
import { hyphenateTag } from '../../utils/shared'
import { generateElementChildren } from './elementChildren'
import { generateComponent, generateElement } from './element'
import { generateInterpolation } from './interpolation'
import { generateSlotOutlet } from './slotOutlet'
import { generateWxFor } from './wxFor'
import { generateWxIf } from './wxIf'
import { generateVSlot } from './vSlot'
import { getTemplateTagCandidates, isMpxTagName } from './tagIdentity'

const transformContext = {
  onError: () => {},
  helperString: str => str.toString(),
  replaceNode: () => {},
  cacheHandlers: false,
  prefixIdentifiers: false,
  scopes: {
    vFor: 0,
    vOnce: 0,
    vPre: 0,
    vSlot: 0,
  },
  expressionPlugins: ['typescript'],
} as Partial<CompilerDOM.TransformContext> as CompilerDOM.TransformContext

export function* generateTemplateChild(
  options: TemplateCodegenOptions,
  ctx: TemplateCodegenContext,
  node:
    | CompilerDOM.RootNode
    | CompilerDOM.TemplateChildNode
    | CompilerDOM.SimpleExpressionNode,
  enterNode: boolean = true,
): Generator<Code> {
  if (enterNode && !ctx.enter(node)) {
    return
  }

  const cur = node as
    | CompilerDOM.ElementNode
    | CompilerDOM.IfNode
    | CompilerDOM.ForNode
  if (cur.codegenNode?.type === CompilerDOM.NodeTypes.JS_CACHE_EXPRESSION) {
    cur.codegenNode = cur.codegenNode.value as any
  }

  if (node.type === CompilerDOM.NodeTypes.ROOT) {
    for (const item of collectSingleRootNodes(options, node.children)) {
      ctx.singleRootNodes.add(item)
    }
    yield* generateElementChildren(options, ctx, node.children)
  } else if (node.type === CompilerDOM.NodeTypes.ELEMENT) {
    const wxForNode = getWxForNode(node)
    const wxIfNode = getWxIfNode(node)
    if (wxForNode) {
      yield* generateWxFor(options, ctx, wxForNode)
    } else if (wxIfNode) {
      yield* generateWxIf(options, ctx, wxIfNode)
    } else if (
      node.tagType === CompilerDOM.ElementTypes.SLOT &&
      !node.props.some(isMpxTagName)
    ) {
      yield* generateSlotOutlet(options, ctx, node)
    } else {
      const slotDir = node.props.find(
        p => p.type === CompilerDOM.NodeTypes.DIRECTIVE && p.name === 'slot',
      ) as CompilerDOM.DirectiveNode
      if (
        node.tagType === CompilerDOM.ElementTypes.TEMPLATE &&
        ctx.currentComponent &&
        slotDir
      ) {
        yield* generateVSlot(options, ctx, node, slotDir)
      } else {
        collectStyleScopedClassReferences(options, ctx, node)
        const candidates = getTemplateTagCandidates(node).filter(
          candidate =>
            !(
              candidate.identity.name === 'template' &&
              candidate.props.some(prop => ['name', 'is'].includes(prop.name))
            ),
        )
        const previousMappings = new Map<
          string,
          Set<'semantic' | 'navigation' | 'completion'>
        >()
        for (let i = 0; i < candidates.length; i++) {
          const { identity, props } = candidates[i]
          const effectiveNode = identity.sourceTag
            ? ({
                ...node,
                tag: identity.name,
                tagType:
                  nativeComponentNames.has(identity.name) ||
                  CompilerDOM.parserOptions.isNativeTag?.(identity.name)
                    ? CompilerDOM.ElementTypes.ELEMENT
                    : CompilerDOM.ElementTypes.COMPONENT,
              } as CompilerDOM.ElementNode)
            : { ...node }
          effectiveNode.props = props
          if (candidates.length > 1) ctx.multiTagNodes.add(effectiveNode)
          // Each possible tag checks its own props. Traverse the shared subtree
          // only once, retaining the parser's raw open/close tag locations.
          if (i < candidates.length - 1) effectiveNode.children = []
          if (ctx.singleRootNodes.has(node))
            ctx.singleRootNodes.add(effectiveNode)
          const { currentComponent } = ctx
          const codes =
            effectiveNode.tagType === CompilerDOM.ElementTypes.ELEMENT ||
            effectiveNode.tagType === CompilerDOM.ElementTypes.TEMPLATE
              ? generateElement(options, ctx, effectiveNode, identity)
              : effectiveNode.tagType === CompilerDOM.ElementTypes.SLOT
                ? generateSlotOutlet(options, ctx, effectiveNode)
                : generateComponent(options, ctx, effectiveNode, identity)
          if (candidates.length === 1) {
            if (ctx.codeBuffer) {
              const buffer = ctx.codeBuffer
              for (const code of codes) appendCode(buffer, code)
            } else yield* codes
            ctx.currentComponent = currentComponent
            continue
          }
          // Shared expressions need verification on every possible target, but
          // only one semantic/completion/navigation mapping per source spelling.
          const currentMappings = new Map<
            string,
            Set<'semantic' | 'navigation' | 'completion'>
          >()
          // Multi-tag candidates filter the emitted mappings, so keep their
          // subtree in this stream rather than writing around the filter.
          const buffer = ctx.codeBuffer
          ctx.codeBuffer = undefined
          try {
            for (const code of codes) {
              if (typeof code === 'string') {
                yield code
                continue
              }
              const key = `${code[1]}:${code[2]}:${code[0].length}`
              const seen = previousMappings.get(key)
              const features = { ...code[3] }
              for (const feature of [
                'semantic',
                'navigation',
                'completion',
              ] as const) {
                if (!features[feature]) continue
                if (seen?.has(feature)) delete features[feature]
                else {
                  let current = currentMappings.get(key)
                  if (!current) currentMappings.set(key, (current = new Set()))
                  current.add(feature)
                }
              }
              yield [code[0], code[1], code[2], features]
            }
          } finally {
            ctx.codeBuffer = buffer
          }
          for (const [key, features] of currentMappings) {
            const previous = previousMappings.get(key) ?? new Set()
            features.forEach(feature => previous.add(feature))
            previousMappings.set(key, previous)
          }
          ctx.currentComponent = currentComponent
        }
      }
    }
  } else if (node.type === CompilerDOM.NodeTypes.TEXT_CALL) {
    // {{ var }}
    yield* generateTemplateChild(options, ctx, node.content, false)
  } else if (node.type === CompilerDOM.NodeTypes.COMPOUND_EXPRESSION) {
    // {{ ... }} {{ ... }}
    yield* generateElementChildren(
      options,
      ctx,
      node.children.filter(child => typeof child === 'object'),
      false,
    )
  } else if (node.type === CompilerDOM.NodeTypes.INTERPOLATION) {
    // {{ ... }}
    const [content, start] = parseInterpolationNode(
      node,
      options.template.content,
    )
    yield* generateInterpolation(
      options,
      ctx,
      'template',
      ctx.codeFeatures.all,
      content,
      start,
      node.content.loc,
      `(`,
      `)${endOfLine}`,
    )
  } else if (node.type === CompilerDOM.NodeTypes.IF) {
    // wx:if / wx:elif / wx:else
    yield* generateWxIf(options, ctx, node)
  } else if (node.type === CompilerDOM.NodeTypes.FOR) {
    // wx:for
    yield* generateWxFor(options, ctx, node)
  } else if (node.type === CompilerDOM.NodeTypes.TEXT) {
    // not needed progress
  }

  if (enterNode) {
    yield* ctx.exit()
  }
}

function* collectSingleRootNodes(
  options: TemplateCodegenOptions,
  children: CompilerDOM.TemplateChildNode[],
): Generator<CompilerDOM.ElementNode | null> {
  if (children.length !== 1) {
    // "null" is used to determine whether the component is not always has a single root
    if (children.length > 1) {
      yield null
    }
    return
  }

  const child = children[0]
  if (child.type === CompilerDOM.NodeTypes.IF) {
    for (const branch of child.branches) {
      yield* collectSingleRootNodes(options, branch.children)
    }
    return
  } else if (child.type !== CompilerDOM.NodeTypes.ELEMENT) {
    return
  }
  yield child

  const tag = hyphenateTag(child.tag)
  if (options.mpxCompilerOptions.fallthroughComponentNames.includes(tag)) {
    yield* collectSingleRootNodes(options, child.children)
  }
}

export function getWxForNode(node: CompilerDOM.ElementNode) {
  const forDirective = node.props.find(
    (prop): prop is CompilerDOM.DirectiveNode =>
      prop.type === CompilerDOM.NodeTypes.DIRECTIVE && prop.name === 'for',
  )
  if (forDirective) {
    let forNode: CompilerDOM.ForNode | undefined
    CompilerDOM.processFor(node, forDirective, transformContext, _forNode => {
      forNode = { ..._forNode }
      return undefined
    })
    if (forNode) {
      forNode.children = [
        {
          ...node,
          props: node.props.filter(prop => prop !== forDirective),
        },
      ]
      return forNode
    }
  }
}

function getWxIfNode(node: CompilerDOM.ElementNode) {
  const ifDirective = node.props.find(
    (prop): prop is CompilerDOM.DirectiveNode =>
      prop.type === CompilerDOM.NodeTypes.DIRECTIVE && prop.name === 'if',
  )
  if (ifDirective) {
    let ifNode: CompilerDOM.IfNode | undefined
    CompilerDOM.processIf(node, ifDirective, transformContext, _ifNode => {
      ifNode = { ..._ifNode }
      return undefined
    })
    if (ifNode) {
      for (const branch of ifNode.branches) {
        branch.children = [
          {
            ...node,
            props: node.props.filter(prop => prop !== ifDirective),
          },
        ]
      }
      return ifNode
    }
  }
}

export function parseInterpolationNode(
  node: CompilerDOM.InterpolationNode,
  template: string,
) {
  let content = node.content.loc.source
  let start = node.content.loc.start.offset
  let leftCharacter: string
  let rightCharacter: string

  while (
    (leftCharacter = template.slice(start - 1, start)).trim() === '' &&
    leftCharacter.length
  ) {
    start--
    content = leftCharacter + content
  }
  while (
    (rightCharacter = template.slice(
      start + content.length,
      start + content.length + 1,
    )).trim() === '' &&
    rightCharacter.length
  ) {
    content = content + rightCharacter
  }

  return [content, start] as const
}
