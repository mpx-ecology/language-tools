import type * as ts from 'typescript'
import * as vscode from 'vscode'
import { useCommand } from 'reactive-vscode'

export function activate() {
  useCommand('mpx.action.findAllFileReferences', async (uri?: vscode.Uri) => {
    uri ??= vscode.window.activeTextEditor?.document.uri
    if (!uri || uri.scheme !== 'file') return
    // Opening the document registers it with tsserver, including when the
    // command originates from the Explorer before the component was opened.
    const document = await vscode.workspace.openTextDocument(uri)
    if (document.languageId !== 'mpx') return
    const response = await vscode.commands.executeCommand<
      ts.server.protocol.FileReferencesResponse | undefined
    >('typescript.tsserverRequest', '_mpx:fileReferences', { file: uri.fsPath })
    if (!response?.body) {
      vscode.window.showErrorMessage(
        'Mpx: Unable to find file references. Restart the Mpx and TS servers and try again.',
      )
      return
    }
    const locations = response.body.refs.map(
      reference =>
        new vscode.Location(
          vscode.Uri.file(reference.file),
          new vscode.Range(
            reference.start.line - 1,
            reference.start.offset - 1,
            reference.end.line - 1,
            reference.end.offset - 1,
          ),
        ),
    )
    await vscode.commands.executeCommand(
      'editor.action.showReferences',
      uri,
      new vscode.Position(0, 0),
      locations,
    )
    return locations
  })
}
