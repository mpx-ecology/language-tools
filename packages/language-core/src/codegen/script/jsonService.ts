import type { Code, Sfc } from '../../types'

const semanticFeatures = {
  verification: true,
  completion: true,
  semantic: true,
  navigation: true,
}

/** Semantic-only CommonJS projection; the raw block owns formatting and links. */
export function* generateJsonService(
  ts: typeof import('typescript'),
  json: NonNullable<Sfc['json']>,
): Generator<Code> {
  // Keep compiler pragmas and directive prologues before generated statements.
  // Original comments stay next to their statements, including directives
  // that suppress diagnostics on the following statement.
  const firstStatement = json.ast.statements.find(
    statement =>
      !ts.isExpressionStatement(statement) ||
      !ts.isStringLiteral(statement.expression),
  )
  const preambleEnd = firstStatement?.getStart(json.ast) ?? json.content.length
  const preamble = json.content.slice(0, preambleEnd)
  const scanner = ts.createScanner(
    ts.ScriptTarget.Latest,
    false,
    ts.LanguageVariant.Standard,
    preamble,
  )
  const parts: string[] = []
  const references: { pos: number; end: number }[] = []
  let cursor = 0
  for (
    let token = scanner.scan();
    token !== ts.SyntaxKind.EndOfFileToken;
    token = scanner.scan()
  ) {
    const start = scanner.getTokenPos()
    const end = scanner.getTextPos()
    // Copy pragmas, not JSDoc declarations such as @typedef/@import. Replacing
    // the extra '*' keeps the text length and all reference/edit offsets.
    if (
      token === ts.SyntaxKind.MultiLineCommentTrivia &&
      end - start > 4 &&
      preamble.startsWith('/**', start)
    ) {
      parts.push(preamble.slice(cursor, start + 2), ' ')
      cursor = start + 3
    }
    if (
      token === ts.SyntaxKind.SingleLineCommentTrivia &&
      /^\/\/\/\s*<reference\b/.test(preamble.slice(start, end))
    ) {
      references.push({ pos: start, end })
    }
  }
  parts.push(preamble.slice(cursor))
  const compilerPreamble = parts.join('')

  // Auto-import insertions map to leading trivia. Reference directives are
  // recognized only here, before statements, and retain all semantic features.
  let start = 0
  for (const reference of references) {
    yield [
      compilerPreamble.slice(start, reference.pos),
      json.name,
      start,
      { completion: true },
    ]
    yield [
      compilerPreamble.slice(reference.pos, reference.end),
      json.name,
      reference.pos,
      semanticFeatures,
    ]
    start = reference.end
  }
  yield [compilerPreamble.slice(start), json.name, start, { completion: true }]

  // Mpx starts with an empty CommonJS module and two string parameters. Keep
  // their declarations local; initial exports also isolates incomplete buffers
  // when the project uses moduleDetection: legacy. None of this maps to source.
  yield '\nmodule.exports = {};\n'
  yield '/** @type {string} */ var __dirname = "";\n'
  yield '/** @type {string} */ var __filename = "";\n'

  // Ordinary symbols and diagnostics use the original text. Reference comments
  // delegate to the preamble so navigation, rename and diagnostics are unique.
  start = 0
  for (const reference of references) {
    if (reference.pos > start)
      yield [
        json.content.slice(start, reference.pos),
        json.name,
        start,
        semanticFeatures,
      ]
    yield [
      json.content.slice(reference.pos, reference.end),
      json.name,
      reference.pos,
      { completion: true },
    ]
    start = reference.end
  }
  if (start < json.content.length || json.content.length === 0) {
    yield [json.content.slice(start), json.name, start, semanticFeatures]
  }
}
