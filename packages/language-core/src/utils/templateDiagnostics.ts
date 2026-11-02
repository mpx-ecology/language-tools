import type * as ts from 'typescript'
import type { MpxVirtualCode } from '../virtualFile/mpxFile'

const contextNames = new Set(['__MPX_ctx', '__MPX_dollars'])

export function formatTemplateDiagnosticMessage(
  ts: typeof import('typescript'),
  root: MpxVirtualCode,
  start: number,
  length: number,
  message: string,
): string {
  const template = root.sfc.template
  if (
    !template ||
    start < template.startTagEnd ||
    start + length > template.endTagStart ||
    !/__MPX_(?:ctx|dollars)\./.test(message)
  ) {
    return message
  }

  const sourceText = root.snapshot.getText(start, start + length)
  const sourceTokens = expressionTokens(sourceText, false)
  const edits: [number, number][] = []
  for (const match of message.matchAll(/['“]/g)) {
    const expressionStart = match.index! + 1
    if (expressionStart <= (edits.at(-1)?.[1] ?? -1)) continue
    const quote = match[0] === '“' ? '”' : "'"
    let end = message.indexOf(quote, expressionStart)
    while (end !== -1) {
      const expression = message.slice(expressionStart, end)
      // Match the actual source expression, rather than replacing text in
      // unrelated type names or user string literals printed by TypeScript.
      if (
        /__MPX_(?:ctx|dollars)\./.test(expression) &&
        expressionTokens(expression, true) === sourceTokens
      ) {
        edits.push([expressionStart, end])
        break
      }
      end = message.indexOf(quote, end + 1)
    }
  }
  for (const [start, end] of edits.reverse()) {
    message = message.slice(0, start) + sourceText + message.slice(end)
  }
  return message

  function expressionTokens(expression: string, stripContext: boolean) {
    const scanner = ts.createScanner(ts.ScriptTarget.Latest, true)
    scanner.setText(expression)
    const tokens: [ts.SyntaxKind, string][] = []
    let kind: ts.SyntaxKind
    while ((kind = scanner.scan()) !== ts.SyntaxKind.EndOfFileToken) {
      tokens.push([kind, scanner.getTokenText()])
    }
    // String literals are single tokens. A context-like member after a dot
    // also belongs to the user, so only strip injected access roots.
    return tokens
      .filter(([kind, text], index) => {
        if (!stripContext) return true
        const contextIndex = kind === ts.SyntaxKind.DotToken ? index - 1 : index
        const previous = tokens[contextIndex - 1]?.[0]
        return !(
          contextNames.has(tokens[contextIndex]?.[1]) &&
          tokens[contextIndex + 1]?.[0] === ts.SyntaxKind.DotToken &&
          previous !== ts.SyntaxKind.DotToken &&
          previous !== ts.SyntaxKind.QuestionDotToken &&
          (kind === ts.SyntaxKind.Identifier || text === '.')
        )
      })
      .map(([, text]) => text)
      .join('\0')
  }
}
