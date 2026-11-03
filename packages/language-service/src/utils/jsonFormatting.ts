import type { TextEdit } from 'vscode-languageserver-protocol'
import type { TextDocument } from 'vscode-languageserver-textdocument'

/** Keep the source block's opening newline when a formatter replaces it. */
export function preserveJsonLeadingNewline(
  document: TextDocument,
  edits: TextEdit[] | undefined | null,
) {
  const leading = /^[\t ]*(\r\n|\n)/.exec(document.getText())
  if (!leading || !edits) return edits
  return edits.map(edit =>
    document.offsetAt(edit.range.start) === 0 &&
    document.offsetAt(edit.range.end) >= leading[0].length &&
    !/^\r?\n/.test(edit.newText)
      ? { ...edit, newText: leading[1] + edit.newText }
      : edit,
  )
}
