import * as CompilerDOM from '@vue/compiler-dom'
import type { Node } from '../internalTypes'

export function transformMpxTemplateNodes<T extends Node>(children: T[]): T[] {
  return children.map(child => visitNode(child) ?? child)
}

import { findResultSync } from '../utils/utils'

function stripSourceLocationSource(prefix?: string, suffix?: string) {
  return (location: CompilerDOM.SourceLocation) => {
    let isMatched = false

    if (prefix) {
      if (location.source.startsWith(prefix)) {
        location.start.offset += prefix.length
        location.source = location.source.slice(prefix.length)
        isMatched = true
      }
    }
    if (suffix) {
      if (location.source.endsWith(suffix)) {
        location.end.offset -= suffix.length
        location.source = location.source.slice(0, -suffix.length)
        isMatched = true
      }
    }

    return isMatched
  }
}

function stripListSourceLocationText(
  prefix?: string[],
  suffix?: string[],
): (location: CompilerDOM.SourceLocation) => boolean {
  const prefixFactor = prefix?.map(item => stripSourceLocationSource(item))
  const suffixFactor = suffix?.map(item =>
    stripSourceLocationSource(undefined, item),
  )

  return (location: CompilerDOM.SourceLocation) => {
    let isMatched = false
    if (prefixFactor?.some(factor => factor(location))) {
      isMatched = true
    }

    if (suffixFactor?.some(factor => factor(location))) {
      isMatched = true
    }

    return isMatched
  }
}

const stripSourceLocationQuotes = stripListSourceLocationText(
  ['"', "'"],
  ['"', "'"],
)

const eventPrefixList = [
  'bind',
  'bind:',
  'catch',
  'catch:',
  'capture-bind:',
  'capture-catch:',
]
const stripBindPrefix = stripListSourceLocationText(eventPrefixList)

function tryProcessWxFor(
  node:
    | CompilerDOM.PlainElementNode
    | CompilerDOM.ComponentNode
    | CompilerDOM.SlotOutletNode
    | CompilerDOM.TemplateNode,
) {
  const captureResult: [
    _for: CompilerDOM.AttributeNode | undefined,
    key: CompilerDOM.AttributeNode | undefined,
    index: CompilerDOM.AttributeNode | undefined,
  ] = [] as any
  let _forIndex = -1
  {
    let count = 0
    const captureAttr = ['wx:for', 'wx:for-item', 'wx:for-index']
    const captureIndex: number[] = []

    for (let i = node.props.length - 1; i >= 0; i--) {
      const prop = node.props[i]
      if (prop.type !== CompilerDOM.NodeTypes.ATTRIBUTE) {
        continue
      }

      const index = captureAttr.indexOf(prop.name)
      if (index === -1) continue

      count++

      captureResult[index] = prop
      captureIndex[index] = i

      if (prop.name === 'wx:for') {
        _forIndex = i
      }

      if (count >= captureAttr.length) {
        break
      }
    }

    if (count < 1) return
  }

  {
    const [prop, value, index] = captureResult
    if (!prop) {
      return
    }
    function createVarNode(
      node: CompilerDOM.AttributeNode | undefined,
      defailtText: string,
    ): CompilerDOM.ExpressionNode {
      if (node && node.value) {
        stripSourceLocationQuotes(node.value.loc)

        return {
          type: CompilerDOM.NodeTypes.SIMPLE_EXPRESSION,
          content: node.value.content || '',
          isStatic: false,
          constType: CompilerDOM.ConstantTypes.NOT_CONSTANT,
          loc: node.value.loc,
        }
      }

      return {
        type: CompilerDOM.NodeTypes.SIMPLE_EXPRESSION,
        content: defailtText,
        isStatic: false,
        constType: CompilerDOM.ConstantTypes.NOT_CONSTANT,
        loc: {
          start: prop?.value?.loc.start ?? { offset: 0, column: 0, line: 0 },
          end: { offset: 0, column: 0, line: 0 },
          source: defailtText,
        },
      } satisfies CompilerDOM.SimpleExpressionNode
    }

    node.props.splice(_forIndex, 1)

    const contentLoc = prop.value!.loc
    stripSourceLocationQuotes(contentLoc)
    stripListSourceLocationText(['{{'], ['}}'])(contentLoc)

    const valueNode = createVarNode(value, 'item')
    const indexNode = createVarNode(index, 'index')
    const source = {
      constType: 0,
      content: contentLoc.source,
      isStatic: false,
      loc: contentLoc,
      type: CompilerDOM.NodeTypes.SIMPLE_EXPRESSION,
    } satisfies CompilerDOM.ExpressionNode
    const children = transformMpxTemplateNodes([node])
    return {
      type: CompilerDOM.NodeTypes.FOR,
      valueAlias: valueNode,
      keyAlias: undefined,
      objectIndexAlias: indexNode,
      loc: contentLoc,
      children: children as CompilerDOM.TemplateChildNode[],
      parseResult: {
        mpx: true,
        defaultIndex: !index,
        defaultValue: !value,
        source,
        key: undefined,
        value: valueNode,
        index: indexNode,
        finalized: true,
      },
      source,
    } satisfies CompilerDOM.ForNode
  }
}

function tryProcessBindEvent(
  prop: CompilerDOM.AttributeNode,
): CompilerDOM.DirectiveNode | undefined {
  if (!isEventBind(prop.name)) return
  // bind:tap="handleTap"
  // bindtap="handleTap"
  const nameLoc = prop.nameLoc
  stripBindPrefix(nameLoc)

  if (prop.value?.loc) stripSourceLocationQuotes(prop.value.loc)

  const contentLoc = prop.loc
  return {
    type: CompilerDOM.NodeTypes.DIRECTIVE,
    name: 'on',
    loc: contentLoc,
    arg: {
      // tap
      type: CompilerDOM.NodeTypes.SIMPLE_EXPRESSION,
      // should trim quotes
      content: prop.name.slice(4),
      isStatic: true,
      constType: CompilerDOM.ConstantTypes.CAN_STRINGIFY,
      loc: nameLoc,
    },
    exp: {
      // handleTap
      type: CompilerDOM.NodeTypes.SIMPLE_EXPRESSION,
      // should trim quotesx
      content: prop.value?.content || '',
      loc: prop.value?.loc ?? emptySourceLocation(),
      isStatic: false,
      constType: CompilerDOM.ConstantTypes.NOT_CONSTANT,
    },
    modifiers: [],
    rawName: prop.name,
  }
}

function isEventBind(name: string) {
  return eventPrefixList.some(item => name.startsWith(item))
}

function emptySourceLocation(): CompilerDOM.SourceLocation {
  return {
    start: { offset: 0, column: 0, line: 0 },
    end: { offset: 0, column: 0, line: 0 },
    source: '',
  }
}

function visitNode<T extends Node>(node: T): T | undefined {
  if (node.type === CompilerDOM.NodeTypes.COMMENT) {
    // TODO Mpx comment
  } else if (node.type === CompilerDOM.NodeTypes.ELEMENT) {
    // pre process for
    const replaceNode = tryProcessWxFor(node)

    if (replaceNode) {
      return replaceNode as T
    }

    for (let index = 0; index < node.props.length; index++) {
      const prop = node.props[index]

      if (prop.type === CompilerDOM.NodeTypes.ATTRIBUTE) {
        const result = findResultSync([() => tryProcessBindEvent(prop)], fn =>
          fn(),
        )

        if (result) {
          node.props.splice(index, 1, result)
        }
      }
    }

    node.children = transformMpxTemplateNodes(node.children)
  } else if (node.type === CompilerDOM.NodeTypes.IF) {
    for (let i = 0; i < node.branches.length; i++) {
      const branch = node.branches[i]
      branch.children = transformMpxTemplateNodes(branch.children)
    }
  } else if (node.type === CompilerDOM.NodeTypes.FOR) {
    // const { leftExpressionRange, leftExpressionText } = parseWxForNode(node)
    // const { source } = node.parseResult
    // if (
    //   leftExpressionRange &&
    //   leftExpressionText &&
    //   source.type === CompilerDOM.NodeTypes.SIMPLE_EXPRESSION
    // ) {
    // }
    node.children = transformMpxTemplateNodes(node.children)
  } else if (node.type === CompilerDOM.NodeTypes.TEXT_CALL) {
    // {{ var }}
    visitNode(node.content)
  } else if (node.type === CompilerDOM.NodeTypes.COMPOUND_EXPRESSION) {
    // {{ ... }} {{ ... }}
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-expect-error
    node.children = transformMpxTemplateNodes(node.children)
  }

  return
}
