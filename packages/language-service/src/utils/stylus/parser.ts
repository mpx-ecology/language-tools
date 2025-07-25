/**
 * @reference https://github.com/d4rkr00t/language-stylus/blob/master/src/parser.ts
 * @reference https://github.com/mpx-ecology/vscode-mpx/blob/master/server/src/modes/style/stylus/parser.ts
 */
import type * as vscode from 'vscode-languageserver-protocol'
import * as stylus from 'stylus'
import cssColors from './cssColors'

type NodeName =
  | 'Ident'
  | 'Selector'
  | 'Call'
  | 'Function'
  | 'Media'
  | 'Keyframes'
  | 'Atrule'
  | 'Import'
  | 'Require'
  | 'Supports'
  | 'Literal'
  | 'Group'
  | 'Root'
  | 'Block'
  | 'Expression'
  | 'Rgba'
  | 'Property'
  | 'Object'

export interface StylusNode {
  __type: NodeName
  name: NodeName
  lineno: number
  column: number
  segments: StylusNode[]
  expr?: StylusNode
  val?: StylusNode
  nodes?: StylusNode[]
  vals?: StylusNode[]
  block?: StylusNode
  __scope?: number[]
  string?: string
}

/**
 * Checks wether node is variable declaration
 */
export function isVariableNode(node: StylusNode): boolean {
  return (
    node.__type === 'Ident' && !!node.val && node.val.__type === 'Expression'
  )
}

/**
 * Checks wether node is function declaration
 */
export function isFunctionNode(node: StylusNode): boolean {
  return node.__type === 'Ident' && !!node.val && node.val.__type === 'Function'
}

/**
 * Checks wether node is selector node
 */
export function isSelectorNode(node: StylusNode): boolean {
  return node.__type === 'Selector'
}

/**
 * Checks wether node is selector call node e.g.: {mySelectors}
 */
export function isSelectorCallNode(node: StylusNode): boolean {
  return node.__type === 'Call' && node.name === 'Selector'
}

/**
 * Checks wether node is at rule
 */
export function isAtRuleNode(node: StylusNode): boolean {
  return (
    [
      'Media',
      'Keyframes',
      'Atrule',
      'Import',
      'Require',
      'Supports',
      'Literal',
    ].indexOf(node.__type) !== -1
  )
}

/**
 * Checks wether node contains color
 */
export function isColor(node: StylusNode): boolean {
  if (node.__type === 'Ident' && cssColors.indexOf(node.name) >= 0) {
    return true
  }
  if (node.__type === 'Rgba') {
    return true
  }
  if (
    node.__type === 'Call' &&
    ['rgb', 'rgba', 'hsl', 'hsla'].indexOf(node.name) >= 0
  ) {
    return true
  }
  return false
}

/**
 * Parses text editor content and returns ast
 */
export function buildAst(text: string): StylusNode | null {
  try {
    // @ts-ignore
    const root = new stylus.Parser(text).parse()
    // root is read only
    const ret = JSON.parse(JSON.stringify(root.toJSON()))
    addScope(ret, 0, [])
    return ret
  } catch (error) {
    return null
  }
}

/**
 * Add scope info to ast
 */
function addScope(root: StylusNode, seq: number, scope: number[]) {
  if (!root || typeof root !== 'object') {
    return
  }
  root.__scope = scope
  if (root.block) {
    const vals = root.block.nodes || []
    for (let i = 0, l = vals.length; i < l; i++) {
      addScope(vals[i], i, scope.concat(seq))
    }
  }
  if (root.vals) {
    const vals = root.vals
    for (let i = 0, l = vals.length; i < l; i++) {
      addScope(vals[i], i, scope.concat())
    }
  }
  if (root.segments) {
    for (const seg of root.segments) {
      addScope(seg, seq, scope.concat())
    }
  }
  if (root.expr) {
    addScope(root.expr, seq, scope.concat())
  }
  if (root.nodes) {
    const vals = root.nodes
    for (let i = 0, l = vals.length; i < l; i++) {
      addScope(vals[i], i, scope.concat())
    }
  }
  if (root.val) {
    addScope(root.val, seq, scope.concat())
  }
}

/**
 * Flattens ast and removes useless nodes
 */
export function flattenAndFilterAst(
  node: StylusNode,
  scope: number[] = [],
): StylusNode[] {
  if (!node.__type) {
    return []
  }
  ;(node as any)['scope'] = scope

  let nested = [node]

  if (node.nodes) {
    let i = 0
    for (const child of node.nodes) {
      const newScope = scope.concat(i++)
      nested = nested.concat(flattenAndFilterAst(child, newScope))
    }
  }

  if (node.block) {
    nested = nested.concat(flattenAndFilterAst(node.block, scope))
  }

  return nested
}

export function findNodeAtPosition(
  root: StylusNode,
  pos: vscode.Position,
): StylusNode | null {
  // DFS: first find leaf node
  const block = root.block
  let children: StylusNode[] = []
  if (block) {
    children = [block] //needBlock ? [block] : (block.nodes || [])
  }
  if (root.vals) {
    children = children.concat(root.vals)
  }
  if (root.expr) {
    children = children.concat(root.expr.nodes || [])
  }
  if (root.nodes) {
    children = children.concat(root.nodes)
  }
  if (root.val) {
    children.push(root.val)
  }
  for (const child of children) {
    const ret = findNodeAtPosition(child, pos)
    if (ret) {
      return ret
    }
  }
  if (root.__type === 'Function' && root.lineno === pos.line + 1) {
    return root // function node column is inconsisten, ignore
  }
  if (root.lineno !== pos.line + 1 || root.column > pos.character + 1) {
    // not in oneline, or root has passed pos
    return null
  }
  return root
}
