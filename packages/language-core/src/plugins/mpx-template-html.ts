import type { MpxLanguagePlugin } from '../types'

import * as CompilerDOM from '@vue/compiler-dom'

function visitNodeChildren<T extends Node>(children: T[]): T[] {
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
            contentLoc.start.offset += 2
            contentLoc.end.offset -= 2
            contentLoc.start.column += 2
            contentLoc.end.column -= 2
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
            const children = visitNodeChildren([node])
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

    node.children = visitNodeChildren(node.children)
  } else if (node.type === CompilerDOM.NodeTypes.IF) {
    for (let i = 0; i < node.branches.length; i++) {
      const branch = node.branches[i]
      branch.children = visitNodeChildren(branch.children)
    }
  } else if (node.type === CompilerDOM.NodeTypes.FOR) {
    // const { leftExpressionRange, leftExpressionText } = parseVForNode(node)
    // const { source } = node.parseResult
    // if (
    //   leftExpressionRange &&
    //   leftExpressionText &&
    //   source.type === CompilerDOM.NodeTypes.SIMPLE_EXPRESSION
    // ) {
    // }
    node.children = visitNodeChildren(node.children)
  } else if (node.type === CompilerDOM.NodeTypes.TEXT_CALL) {
    // {{ var }}
    visitNode(node.content)
  } else if (node.type === CompilerDOM.NodeTypes.COMPOUND_EXPRESSION) {
    // {{ ... }} {{ ... }}
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-expect-error
    node.children = visitNodeChildren(node.children)
  }

  return
}

interface Loc {
  start: { offset: number }
  end: { offset: number }
  source: string
}
type Node =
  | CompilerDOM.RootNode
  | CompilerDOM.TemplateChildNode
  | CompilerDOM.ExpressionNode
  | CompilerDOM.AttributeNode
  | CompilerDOM.DirectiveNode

const shouldAddSuffix = /(?<=<[^>/]+)$/

const plugin: MpxLanguagePlugin = ({ modules }) => {
  return {
    name: 'mpx-template-html',
    compileSFCTemplate(lang, template, options) {
      if (lang === 'html' || lang === 'md') {
        const compiler = modules['@vue/compiler-dom']

        let addedSuffix = false

        // #4583
        if (shouldAddSuffix.test(template)) {
          template += '>'
          addedSuffix = true
        }

        const result = compiler.compile(template, {
          ...options,
          comments: true,
        })

        // @ts-expect-error ignore
        result.__addedSuffix = addedSuffix
        result.ast.children = visitNodeChildren(result.ast.children)
        return result
      }
    },

    updateSFCTemplate(oldResult, change) {
      oldResult.code =
        oldResult.code.slice(0, change.start) +
        change.newText +
        oldResult.code.slice(change.end)

      // @ts-expect-error ignore
      if (oldResult.__addedSuffix) {
        const originalTemplate = oldResult.code.slice(0, -1) // remove added '>'
        if (!shouldAddSuffix.test(originalTemplate)) {
          return undefined
        }
      }

      const CompilerDOM = modules['@vue/compiler-dom']

      const lengthDiff = change.newText.length - (change.end - change.start)
      let hitNodes: Node[] = []

      if (tryUpdateNode(oldResult.ast) && hitNodes.length) {
        hitNodes = hitNodes.sort(
          (a, b) => a.loc.source.length - b.loc.source.length,
        )
        const hitNode = hitNodes[0]
        if (hitNode.type === CompilerDOM.NodeTypes.SIMPLE_EXPRESSION) {
          return oldResult
        }
      }

      function tryUpdateNode(node: Node) {
        if (withinChangeRange(node.loc)) {
          hitNodes.push(node)
        }

        if (tryUpdateNodeLoc(node.loc)) {
          if (node.type === CompilerDOM.NodeTypes.ROOT) {
            for (const child of node.children) {
              if (!tryUpdateNode(child)) {
                return false
              }
            }
          } else if (node.type === CompilerDOM.NodeTypes.ELEMENT) {
            if (withinChangeRange(node.loc)) {
              // if not self closing, should not hit tag name
              const start = node.loc.start.offset + 2
              const end =
                node.loc.start.offset + node.loc.source.lastIndexOf('</')
              if (
                !withinChangeRange({
                  start: { offset: start },
                  end: { offset: end },
                  source: '',
                })
              ) {
                return false
              }
            }
            for (const prop of node.props) {
              if (!tryUpdateNode(prop)) {
                return false
              }
            }
            for (const child of node.children) {
              if (!tryUpdateNode(child)) {
                return false
              }
            }
          } else if (node.type === CompilerDOM.NodeTypes.ATTRIBUTE) {
            if (node.value && !tryUpdateNode(node.value)) {
              return false
            }
          } else if (node.type === CompilerDOM.NodeTypes.DIRECTIVE) {
            if (
              node.arg &&
              withinChangeRange(node.arg.loc) &&
              node.name === 'slot'
            ) {
              return false
            }
            if (
              node.exp &&
              withinChangeRange(node.exp.loc) &&
              node.name === 'for'
            ) {
              // #2266
              return false
            }
            if (node.arg && !tryUpdateNode(node.arg)) {
              return false
            }
            if (node.exp && !tryUpdateNode(node.exp)) {
              return false
            }
          } else if (node.type === CompilerDOM.NodeTypes.TEXT_CALL) {
            if (!tryUpdateNode(node.content)) {
              return false
            }
          } else if (node.type === CompilerDOM.NodeTypes.COMPOUND_EXPRESSION) {
            for (const childNode of node.children) {
              if (typeof childNode === 'object') {
                if (
                  !tryUpdateNode(childNode as CompilerDOM.TemplateChildNode)
                ) {
                  return false
                }
              }
            }
          } else if (node.type === CompilerDOM.NodeTypes.IF) {
            for (const branch of node.branches) {
              if (branch.condition && !tryUpdateNode(branch.condition)) {
                return false
              }
              for (const child of branch.children) {
                if (!tryUpdateNode(child)) {
                  return false
                }
              }
            }
          } else if (node.type === CompilerDOM.NodeTypes.FOR) {
            for (const child of [
              node.parseResult.source,
              node.parseResult.value,
              node.parseResult.key,
              node.parseResult.index,
            ]) {
              if (child) {
                if (!tryUpdateNode(child)) {
                  return false
                }
                if (child.type === CompilerDOM.NodeTypes.SIMPLE_EXPRESSION) {
                  const content = child.content.trim()
                  if (content.startsWith('(') || content.endsWith(')')) {
                    return false
                  }
                }
              }
            }
            for (const child of node.children) {
              if (!tryUpdateNode(child)) {
                return false
              }
            }
          } else if (node.type === CompilerDOM.NodeTypes.INTERPOLATION) {
            if (!tryUpdateNode(node.content)) {
              return false
            }
          } else if (node.type === CompilerDOM.NodeTypes.SIMPLE_EXPRESSION) {
            if (withinChangeRange(node.loc)) {
              // TODO: review this (slot name?)
              if (node.isStatic) {
                return false
              } else if (!node.loc.source) {
                // :class="..." -> :class=""
                return false
              } else {
                node.content = node.loc.source
              }
            }
          }

          return true
        }

        return false
      }
      function tryUpdateNodeLoc(loc: Loc) {
        delete (loc as any).__endOffset

        if (withinChangeRange(loc)) {
          loc.source =
            loc.source.slice(0, change.start - loc.start.offset) +
            change.newText +
            loc.source.slice(change.end - loc.start.offset)
          ;(loc as any).__endOffset = loc.end.offset
          loc.end.offset += lengthDiff
          return true
        } else if (change.end <= loc.start.offset) {
          ;(loc as any).__endOffset = loc.end.offset
          loc.start.offset += lengthDiff
          loc.end.offset += lengthDiff
          return true
        } else if (change.start >= loc.end.offset) {
          return true // no need update
        }

        return false
      }
      function withinChangeRange(loc: Loc) {
        const originalLocEnd = (loc as any).__endOffset ?? loc.end.offset
        return change.start >= loc.start.offset && change.end <= originalLocEnd
      }
    },
  }
}

export default plugin
