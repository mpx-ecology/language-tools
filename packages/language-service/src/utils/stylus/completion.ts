import type * as vscode from 'vscode-languageserver-protocol'
import type * as CSS from 'vscode-css-languageservice'
import {
  type StylusNode,
  buildAst,
  flattenAndFilterAst,
  isFunctionNode,
  isSelectorCallNode,
  isSelectorNode,
  isVariableNode,
} from './parser'

export function isValue(data: CSS.CSSDataV1, currentWord: string): boolean {
  const property = getPropertyName(currentWord)
  return !!property && Boolean(findPropertySchema(data, property))
}

export function getValues(
  data: CSS.CSSDataV1,
  currentWord: string,
): vscode.CompletionItem[] {
  const property = getPropertyName(currentWord)
  const values = findPropertySchema(data, property)?.values

  if (!values) return []

  return values.map(property => {
    return {
      label: property.name,
      documentation: property.description,
      kind: 12 satisfies typeof vscode.CompletionItemKind.Value,
    } satisfies vscode.CompletionItem
  })
}

/**
 * Returns completion items lists from document symbols
 */
export function getAllSymbols(text: string): vscode.CompletionItem[] {
  const ast = buildAst(text)
  if (!ast) {
    return []
  }
  const splittedText = text.split('\n')
  const rawSymbols = flattenAndFilterAst(ast).filter(
    item =>
      [
        'Media',
        'Keyframes',
        'Atrule',
        'Import',
        'Require',
        'Supports',
        'Literal',
      ].indexOf(item.__type) === -1,
  )

  return compact(
    rawSymbols.map(item => {
      if (isVariableNode(item)) {
        return _variableSymbol(item, splittedText)
      }

      if (isFunctionNode(item)) {
        return _functionSymbol(item)
      }

      if (isSelectorNode(item)) {
        return _selectorSymbol(item)
      }

      if (isSelectorCallNode(item)) {
        return _selectorCallSymbol(item, splittedText)
      }
    }),
  )
}

/**
 * Returns at rules list for completion
 */
export function getAtRules(
  data: CSS.CSSDataV1,
  currentWord: string,
): vscode.CompletionItem[] {
  if (!isAtRule(currentWord) || !data.atDirectives) {
    return []
  }

  return data.atDirectives.map(property => {
    return {
      label: property.name,
      documentation: property.description,
      kind: 14 satisfies typeof vscode.CompletionItemKind.Keyword,
    } satisfies vscode.CompletionItem
  })
}

/**
 * Returns property list for completion
 */
export function getProperties(
  data: CSS.CSSDataV1,
  currentWord: string,
  useSeparator: boolean,
): vscode.CompletionItem[] {
  if (isClassOrId(currentWord) || isAtRule(currentWord) || !data.properties) {
    return []
  }

  return data.properties.map(property => {
    return {
      label: property.name,
      insertText: property.name + (useSeparator ? ': ' : ' '),
      documentation: property.description,
      kind: 10 satisfies typeof vscode.CompletionItemKind.Property,
    } satisfies vscode.CompletionItem
  })
}

function getPropertyName(currentWord: string): string {
  return currentWord.trim().replace(':', ' ').split(' ')[0]
}

function findPropertySchema(data: CSS.CSSDataV1, property: string) {
  return data.properties?.find(item => item.name === property)
}

function compact(arr: Array<any>): Array<any> {
  return arr.filter(item => item)
}

function isAtRule(currentWord: string): boolean {
  return currentWord.startsWith('\@')
}

function isClassOrId(currentWord: string): boolean {
  return /^[.#&]/.test(currentWord)
}

/**
 * Handler for variables
 */
function _variableSymbol(
  node: StylusNode,
  text: string[],
): vscode.CompletionItem {
  const name = node.name
  const lineno = Math.max(0, Number(node.val?.lineno ?? 1) - 1)

  return {
    label: name,
    detail: text[lineno]?.trim() ?? '',
    kind: 6 satisfies typeof vscode.CompletionItemKind.Variable,
  }
}

/**
 * Handler for function
 * @param {Object} node
 * @param {String[]} text - text editor content splitted by lines
 * @return {CompletionItem}
 */
function _functionSymbol(node: StylusNode): vscode.CompletionItem {
  return {
    label: node.name,
    kind: 3 satisfies typeof vscode.CompletionItemKind.Function,
  }
}

/**
 * Handler for selectors
 */
function _selectorSymbol(node: StylusNode): vscode.CompletionItem {
  const firstSegment = node.segments[0]
  const name = firstSegment.string
    ? node.segments!.map(s => s.string).join('')
    : firstSegment.nodes!.map(s => s.name).join('')

  return {
    label: name ?? '',
    kind: 7 satisfies typeof vscode.CompletionItemKind.Class,
  }
}

/**
 * Handler for selector call symbols
 */
function _selectorCallSymbol(
  node: StylusNode,
  text: string[],
): vscode.CompletionItem {
  const lineno = Number(node.lineno) - 1
  const name = text[lineno].replace(/\{|\}/g, '').trim()

  return {
    label: name,
    kind: 7 satisfies typeof vscode.CompletionItemKind.Class,
  }
}
