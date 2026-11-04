import * as vscode from 'vscode'
import { type BaseLanguageClient, State } from '@volar/vscode'
import { ComponentNavigationRangesRequest } from '@mpxjs/language-server/out/protocol'

/** Passive underlines: definition navigation and hover stay with their providers. */
export function activate(
  context: vscode.ExtensionContext,
  selector: vscode.DocumentSelector,
  client: BaseLanguageClient,
) {
  const decoration = vscode.window.createTextEditorDecorationType({
    // Match VS Code's detected-link CSS: place the line below descenders.
    // The decoration API emits this static CSS declaration string verbatim.
    textDecoration: 'underline; text-underline-position: under;',
    rangeBehavior: vscode.DecorationRangeBehavior.ClosedClosed,
  })
  let generation = 0
  let disposed = false
  let timeout: ReturnType<typeof setTimeout> | undefined
  const watcher = vscode.workspace.createFileSystemWatcher('**/*.{mpx,js,json}')
  const matches = (document: vscode.TextDocument) =>
    !!vscode.languages.match(selector, document) &&
    vscode.workspace
      .getConfiguration('editor', {
        uri: document.uri,
        languageId: document.languageId,
      })
      .get('links', true)

  function clear() {
    for (const editor of vscode.window.visibleTextEditors)
      editor.setDecorations(decoration, [])
  }
  function schedule() {
    if (disposed) return
    generation++
    clearTimeout(timeout)
    timeout = setTimeout(() => {
      void refresh(generation)
    }, 100)
  }
  async function refresh(update: number) {
    if (disposed || !client.isRunning()) return
    const documents = new Map<string, vscode.TextDocument>()
    for (const editor of vscode.window.visibleTextEditors) {
      if (matches(editor.document))
        documents.set(editor.document.uri.toString(), editor.document)
      else editor.setDecorations(decoration, [])
    }
    await Promise.all(
      [...documents].map(async ([uri, document]) => {
        const version = document.version
        try {
          const result = await client.sendRequest(
            ComponentNavigationRangesRequest,
            { textDocument: { uri, version } },
          )
          if (
            disposed ||
            generation !== update ||
            document.version !== version ||
            !client.isRunning()
          )
            return
          const ranges = (result.version === version ? result.ranges : []).map(
            range =>
              new vscode.Range(
                range.start.line,
                range.start.character,
                range.end.line,
                range.end.character,
              ),
          )
          for (const editor of vscode.window.visibleTextEditors) {
            if (editor.document === document && matches(document))
              editor.setDecorations(decoration, ranges)
          }
        } catch {
          if (disposed || generation !== update || document.version !== version)
            return
          for (const editor of vscode.window.visibleTextEditors) {
            if (editor.document === document)
              editor.setDecorations(decoration, [])
          }
        }
      }),
    )
  }
  context.subscriptions.push(
    decoration,
    watcher,
    vscode.window.onDidChangeVisibleTextEditors(schedule),
    vscode.window.onDidChangeActiveTextEditor(schedule),
    vscode.workspace.onDidChangeTextDocument(event => {
      if (
        vscode.window.visibleTextEditors.some(
          editor => editor.document === event.document,
        )
      )
        schedule()
    }),
    vscode.workspace.onDidChangeConfiguration(event => {
      if (
        vscode.window.visibleTextEditors.some(editor =>
          event.affectsConfiguration('editor.links', editor.document),
        )
      )
        schedule()
    }),
    watcher.onDidCreate(schedule),
    watcher.onDidDelete(schedule),
    watcher.onDidChange(schedule),
    client.onDidChangeState(event => {
      if (event.newState === State.Running) schedule()
      else {
        generation++
        clearTimeout(timeout)
        clear()
      }
    }),
    new vscode.Disposable(() => {
      disposed = true
      generation++
      clearTimeout(timeout)
    }),
  )
  if (client.isRunning()) schedule()
}
