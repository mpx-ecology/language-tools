import type * as ts from 'typescript'
import type { MpxVirtualCode } from '../virtualFile/mpxFile'

const contextNames = new Set(['__MPX_ctx', '__MPX_dollars'])
// These diagnostics print an expression, rather than a type or string literal.
const expressionDiagnosticCodes = new Set([18046, 18047, 18048, 18049])

export function shouldFormatTemplateDiagnosticMessage(
  message: string,
  code: number | string | undefined,
): boolean {
  return (
    expressionDiagnosticCodes.has(Number(code)) &&
    /__MPX_(?:ctx|dollars)\./.test(message)
  )
}

export function formatTemplateDiagnosticMessage(
  ts: typeof import('typescript'),
  root: MpxVirtualCode,
  start: number,
  length: number,
  message: string,
  code: number | string | undefined,
): string {
  const template = root.sfc.template
  if (
    !template ||
    !shouldFormatTemplateDiagnosticMessage(message, code) ||
    start < template.startTagEnd ||
    start + length > template.endTagStart
  ) {
    return message
  }

  const sourceText = root.snapshot.getText(start, start + length)
  const sourceTokens = expressionTokens(sourceText, false)
  if (!sourceTokens.length) return message
  for (const match of message.matchAll(/__MPX_(?:ctx|dollars)\./g)) {
    const expressionStart = match.index!
    const generatedTokens = expressionTokens(
      message.slice(expressionStart),
      true,
    )
    const last = sourceTokens.length - 1
    // Some translations put prose directly after the expression,
    // without quotes or whitespace (zh-CN TS18049, for example).
    if (
      sourceTokens.every((token, index) =>
        index === last
          ? generatedTokens[index]?.text.startsWith(token.text)
          : generatedTokens[index]?.text === token.text,
      )
    ) {
      const end =
        expressionStart +
        generatedTokens[last].start +
        sourceTokens[last].text.length
      return message.slice(0, expressionStart) + sourceText + message.slice(end)
    }
  }
  return message

  function expressionTokens(expression: string, stripContext: boolean) {
    const scanner = ts.createScanner(ts.ScriptTarget.Latest, true)
    scanner.setText(expression)
    const tokens: { kind: ts.SyntaxKind; text: string; start: number }[] = []
    let kind: ts.SyntaxKind
    while ((kind = scanner.scan()) !== ts.SyntaxKind.EndOfFileToken) {
      tokens.push({
        kind,
        text: scanner.getTokenText(),
        start: scanner.getTokenPos(),
      })
    }
    // String literals are single tokens. A context-like member after a dot
    // also belongs to the user, so only strip injected access roots.
    return tokens.filter(({ kind, text }, index) => {
      if (!stripContext) return true
      const contextIndex = kind === ts.SyntaxKind.DotToken ? index - 1 : index
      const previous = tokens[contextIndex - 1]?.kind
      return !(
        contextNames.has(tokens[contextIndex]?.text) &&
        tokens[contextIndex + 1]?.kind === ts.SyntaxKind.DotToken &&
        previous !== ts.SyntaxKind.DotToken &&
        previous !== ts.SyntaxKind.QuestionDotToken &&
        (kind === ts.SyntaxKind.Identifier || text === '.')
      )
    })
  }
}
