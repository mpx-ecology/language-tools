import * as CompilerDOM from '@vue/compiler-dom'
import type { Node } from '../types/compiler'

export function transformMpxTemplateNodes<T extends Node>(children: T[]): T[] {
  return children.map(child => visitNode(child) ?? child)
}

function visitNode<T extends Node>(node: T): T | undefined {
  if (node.type === CompilerDOM.NodeTypes.COMMENT) {
    // TODO Mpx comment
  } else if (node.type === CompilerDOM.NodeTypes.ELEMENT) {
    // for (const prop of node.props) {}
    for (let index = 0; index < node.props.length; index++) {
      const prop = node.props[index]

      if (prop.type === CompilerDOM.NodeTypes.ATTRIBUTE) {
        switch (prop.name) {
          case 'wx:for': {
            node.props.splice(index, 1)

            const contentLoc = prop.value!.loc
            const content = prop.value?.content.trim()
            const forSource =
              content?.startsWith('{{') && content.endsWith('}}')
                ? content.slice(2, -2)
                : content || ''

            contentLoc.source = forSource
            // eg: '"{{ listData }}"' -> ' listData ' -> offset += 3
            contentLoc.start.offset += 3
            contentLoc.end.offset -= 3
            contentLoc.start.column += 3
            contentLoc.end.column -= 3
            const valueNode = {
              type: CompilerDOM.NodeTypes.SIMPLE_EXPRESSION,
              content: 'item',
              isStatic: false,
              constType: CompilerDOM.ConstantTypes.NOT_CONSTANT,
              loc: {
                start: { offset: 0, column: 0, line: 0 },
                end: { offset: 0, column: 0, line: 0 },
                source: 'item',
              },
            } satisfies CompilerDOM.SimpleExpressionNode
            const children = transformMpxTemplateNodes([node])
            return {
              type: CompilerDOM.NodeTypes.FOR,
              valueAlias: valueNode,
              keyAlias: undefined,
              objectIndexAlias: undefined,
              loc: contentLoc,
              children: children as CompilerDOM.TemplateChildNode[],
              parseResult: {
                mpx: true,
                source: {
                  constType: 0,
                  content: forSource,
                  isStatic: false,
                  loc: contentLoc,
                  type: CompilerDOM.NodeTypes.SIMPLE_EXPRESSION,
                },
                key: undefined,
                value: undefined,
                index: undefined,
                finalized: true,
              },
              // arg: undefined,
              source: {
                type: CompilerDOM.NodeTypes.SIMPLE_EXPRESSION,
                content: forSource,
                isStatic: false,
                constType: CompilerDOM.ConstantTypes.NOT_CONSTANT,
                loc: contentLoc,
              },
            } satisfies CompilerDOM.ForNode as unknown as T
          }
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
