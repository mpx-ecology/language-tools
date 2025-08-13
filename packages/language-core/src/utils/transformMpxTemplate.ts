import * as CompilerDOM from '@vue/compiler-dom'
import type { Node } from '../internalTypes'
import { findResultSync } from '../utils/utils'
import { CompilerOptions } from '@vue/compiler-dom'
import { MpxErrorCodes, createMpxCompilerError } from './errors'

function shouldCombineIfBranchNode(
  prevCondition: CompilerDOM.IfBranchNode['mpxCondition'],
  condition: CompilerDOM.IfBranchNode['mpxCondition'],
): boolean {
  if (!prevCondition || !condition) return false

  return (
    ['if', 'elif'].includes(prevCondition) &&
    ['elif', 'else'].includes(condition)
  )
}

// const mpxErrorMessages = Object.entries({
//   ...CompilerDOM.errorMessages,
// }).reduce(
//   (r, [key, message]) => ({
//     ...r,
//     [key]: message.replace('v-', 'wx:').replace('else-if', 'elif'),
//   }),
//   {} as Record<number, string>,
// )
export function transformMpxTemplateNodes<T extends Node>(
  children: T[] = [],
  options: CompilerOptions,
): T[] {
  const mappedResult = children.map(child => visitNode(child, options) ?? child)

  const result: T[] = []

  let prev = undefined as CompilerDOM.IfNode | undefined
  if (mappedResult.length) {
    for (let i = 0; i < mappedResult.length; i++) {
      const item = mappedResult[i]

      if (item.type === CompilerDOM.NodeTypes.IF_BRANCH) {
        const createNewIfNode = () =>
          ({
            type: CompilerDOM.NodeTypes.IF,
            branches: [],
            loc: item.loc,
          }) as CompilerDOM.IfNode
        let ifNode: CompilerDOM.IfNode | undefined

        if (
          item.mpxCondition === 'if' ||
          prev?.type !== CompilerDOM.NodeTypes.IF
        ) {
          ifNode = createNewIfNode()
        } else if (prev.type === CompilerDOM.NodeTypes.IF) {
          ifNode = prev
        } else {
          ifNode = createNewIfNode()
        }

        const storeIf = () => {
          if (prev !== ifNode) {
            result.push(ifNode as unknown as T)
            prev = ifNode
          }
        }

        const lastBranch = ifNode.branches[ifNode.branches.length - 1]

        if (
          (!lastBranch && item.mpxCondition === 'if') ||
          (lastBranch &&
            shouldCombineIfBranchNode(
              lastBranch.mpxCondition,
              item.mpxCondition,
            ))
        ) {
          ifNode.branches.push(item)
          storeIf()
          continue
        }

        // options.onError?.(
        //   CompilerDOM.createCompilerError(
        //     CompilerDOM.ErrorCodes.X_V_ELSE_NO_ADJACENT_IF,
        //     item.loc,
        //     mpxErrorMessages,
        //   ),
        // )

        // const errorIfNode = prev === ifNode ? createNewIfNode() : ifNode;
        // errorIfNode.branches.push(item)
        // result.push(errorIfNode as unknown as T)
      } else {
        if (item.type !== CompilerDOM.NodeTypes.COMMENT) {
          prev = undefined
        }
        result.push(item)
      }
    }
  }

  return result
}

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
function many<T extends (...args: any) => boolean>(fn: T): T {
  return ((...args: any[]) => {
    let r = false
    while (fn(...args)) {
      r = true
      continue
    }
    return r
  }) as unknown as T
}
function combine<T extends (...args: any) => boolean>(...fns: T[]) {
  return (...args: any[]) => {
    let r = false
    for (const fn of fns) {
      r = fn(...args) || r
    }
    return r
  }
}

const stripSpaces = many(stripListSourceLocationText([' '], [' ']))

/**
 * `"` `'`
 */
const stripSourceLocationQuotes = combine(
  stripSpaces,
  stripListSourceLocationText(['"', "'"], ['"', "'"]),
)

/**
 * `{{` `}}`
 */
// const stripSourceLocationBrace = combine(
//   stripSpaces,
//   stripListSourceLocationText(['{{'], ['}}']),
// )

const eventPrefixList = [
  'bind',
  'bind:',
  'catch',
  'catch:',
  'capture-bind:',
  'capture-catch:',
]
// const stripBindPrefix = stripListSourceLocationText(eventPrefixList)

type ElNode =
  | CompilerDOM.PlainElementNode
  | CompilerDOM.ComponentNode
  | CompilerDOM.SlotOutletNode
  | CompilerDOM.TemplateNode

function tryProcessWxFor(node: ElNode, options: CompilerOptions) {
  try {
    const captureResult: CompilerDOM.AttributeNode[] = []
    let _forIndex = -1

    {
      let count = 0
      const captureAttr = ['wx:for', 'wx:for-item', 'wx:for-index']

      for (let i = node.props.length - 1; i >= 0; i--) {
        const prop = node.props[i]
        if (prop.type !== CompilerDOM.NodeTypes.ATTRIBUTE) {
          continue
        }

        const index = captureAttr.indexOf(prop.name)
        if (index === -1) continue

        count++

        captureResult[index] = prop

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
        defaultText: string,
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
          content: defaultText,
          isStatic: false,
          constType: CompilerDOM.ConstantTypes.NOT_CONSTANT,
          loc: {
            start: prop?.value?.loc.start ?? { offset: 0, column: 0, line: 0 },
            end: { offset: 0, column: 0, line: 0 },
            source: defaultText,
          },
        } satisfies CompilerDOM.SimpleExpressionNode
      }

      node.props.splice(_forIndex, 1)

      const contentLoc = prop.value!.loc
      stripSourceLocationQuotes(contentLoc)
      checkExpressionBraceError(
        contentLoc,
        options,
        MpxErrorCodes.TEMPLATE_WX_FOR_VALUE_BRACE,
      )
      const isExpression = stripListSourceLocationText(
        ['{{'],
        ['}}'],
      )(contentLoc)

      const valueNode = createVarNode(value, 'item')
      const indexNode = createVarNode(index, 'index')
      const source = {
        constType: 0,
        content: contentLoc.source,
        isStatic: !isExpression,
        loc: {
          source: contentLoc.source,
          start: { ...contentLoc.start },
          end: { ...contentLoc.end },
        },
        type: CompilerDOM.NodeTypes.SIMPLE_EXPRESSION,
      } satisfies CompilerDOM.ExpressionNode
      const children = transformMpxTemplateNodes([node], options)

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
  } catch (error) {
    console.warn('[Mpx] Failed to process wx:for:', error)
    return undefined
  }
}

function tryProcessBindEvent(
  prop: CompilerDOM.AttributeNode,
): CompilerDOM.DirectiveNode | undefined {
  if (!isEventBind(prop.name)) return

  // bind:tap="handleTap"
  // bindtap="handleTap"
  const nameLoc = prop.nameLoc
  // fix: 去掉 bind 前缀会导致和属性类型冲突，
  // 比如 <input focus="xx" bindfocus="xx" />
  // bindfocus 会被当做属性 focus 来检查类型
  // // stripBindPrefix(nameLoc)

  if (prop.value?.loc) stripSourceLocationQuotes(prop.value.loc)

  const contentLoc = prop.loc
  return {
    type: CompilerDOM.NodeTypes.DIRECTIVE,
    name: 'on',
    loc: contentLoc,
    arg: {
      // tap
      type: CompilerDOM.NodeTypes.SIMPLE_EXPRESSION,
      content: nameLoc.source,
      isStatic: true,
      constType: CompilerDOM.ConstantTypes.CAN_STRINGIFY,
      loc: nameLoc,
    },
    exp: {
      // handleTap
      type: CompilerDOM.NodeTypes.SIMPLE_EXPRESSION,
      // should trim quotes
      content: prop.value?.content || '',
      loc: prop.value?.loc ?? emptySourceLocation(),
      isStatic: false,
      constType: CompilerDOM.ConstantTypes.NOT_CONSTANT,
    },
    modifiers: [],
    rawName: prop.name,
  }
}

function tryProcessWxIf(node: ElNode, options: CompilerOptions) {
  // wx:if="{{ condition }}"
  // wx:elif="{{ condition }}"
  // wx:else
  const conditionIndex = node.props.findIndex(item => {
    return (
      item.type === CompilerDOM.NodeTypes.ATTRIBUTE &&
      ['wx:if', 'wx:elif', 'wx:else'].includes(item.name)
    )
  })

  if (conditionIndex === -1) return

  {
    const ifBranch = node.props[conditionIndex] as CompilerDOM.AttributeNode
    node.props.splice(conditionIndex, 1)

    const children = transformMpxTemplateNodes([node], options)

    let isExpression = true
    if (ifBranch.value) {
      stripSourceLocationQuotes(ifBranch.value.loc)
      checkExpressionBraceError(
        ifBranch.value.loc,
        options,
        MpxErrorCodes.TEMPLATE_WX_IF_VALUE_BRACE,
      )
      isExpression = stripListSourceLocationText(
        ['{{'],
        ['}}'],
      )(ifBranch.value.loc)
    }

    if (ifBranch.name) stripSourceLocationSource('wx:', '')(ifBranch.nameLoc)

    return {
      type: CompilerDOM.NodeTypes.IF_BRANCH,
      condition:
        ifBranch.nameLoc.source === 'else'
          ? undefined
          : ({
              type: CompilerDOM.NodeTypes.SIMPLE_EXPRESSION,
              content: ifBranch.value?.loc.source ?? '',
              isStatic: !isExpression,
              constType: CompilerDOM.ConstantTypes.NOT_CONSTANT,
              loc: ifBranch.value?.loc ?? emptySourceLocation(),
            } satisfies CompilerDOM.ExpressionNode),
      loc: ifBranch.loc,
      children,
      mpxCondition: ifBranch.nameLoc
        .source as CompilerDOM.IfBranchNode['mpxCondition'],
    } satisfies CompilerDOM.IfBranchNode
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

function visitNode<T extends Node>(
  node: T,
  options: CompilerOptions,
): T | undefined {
  if (node.type === CompilerDOM.NodeTypes.COMMENT) {
    // TODO Mpx comment
  } else if (node.type === CompilerDOM.NodeTypes.ELEMENT) {
    const replaceNode = findResultSync(
      // wx:for 比 wx:if 优先级更高
      [
        () => tryProcessWxFor(node, options),
        () => tryProcessWxIf(node, options),
      ],
      fn => fn(),
    )

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

    node.children = transformMpxTemplateNodes(node.children, options)
  } else if (node.type === CompilerDOM.NodeTypes.IF) {
    for (let i = 0; i < node.branches.length; i++) {
      const branch = node.branches[i]
      branch.children = transformMpxTemplateNodes(branch.children, options)
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
    node.children = transformMpxTemplateNodes(node.children, options)
  } else if (node.type === CompilerDOM.NodeTypes.TEXT_CALL) {
    // {{ var }}
    visitNode(node.content, options)
  } else if (node.type === CompilerDOM.NodeTypes.COMPOUND_EXPRESSION) {
    // {{ ... }} {{ ... }}
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-expect-error
    node.children = transformMpxTemplateNodes(node.children)
  }

  return
}

function checkExpressionBraceError(
  loc: CompilerDOM.SourceLocation,
  options: CompilerOptions,
  errorCode: MpxErrorCodes,
) {
  const trimedSource = loc.source.trim()
  if (trimedSource.startsWith('{{') && trimedSource.endsWith('}}')) {
    const _loc = transformErrorLocation(loc)
    if (stripSpaces(loc)) {
      options.onError?.(createMpxCompilerError(errorCode, _loc))
    }
  }
}

function transformErrorLocation(
  loc: CompilerDOM.SourceLocation,
): CompilerDOM.SourceLocation {
  return {
    start: {
      offset: loc.start.offset,
      column: -1,
      line: -1,
    },
    end: {
      offset: loc.end.offset,
      column: -1,
      line: -1,
    },
    source: '',
  }
}
