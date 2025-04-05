import {
  BaseLanguageClient,
  ExecuteCommandParams,
  ExecuteCommandRequest,
  getTsdk,
} from '@volar/vscode'
import type { SFCParseResult } from '@mpxjs/language-server'
import { commands } from '@mpxjs/language-server/out/types'
import {
  executeCommand,
  extensionContext,
  useActiveTextEditor,
  useCommand,
  useDisposable,
  useEventEmitter,
  useStatusBarItem,
  watchEffect,
} from 'reactive-vscode'
import * as semver from 'semver'
import * as vscode from 'vscode'
import { config } from '../config'

const scheme = 'mpx-doctor'
const knownValidSyntaxHighlightExtensions = {
  postcss: [
    'cpylua.language-postcss',
    'vunguyentuan.vscode-postcss',
    'csstools.postcss',
  ],
  stylus: ['sysoev.language-stylus'],
  sass: ['Syler.sass-indented'],
}

export async function activate(client: BaseLanguageClient) {
  const item = useStatusBarItem({
    alignment: vscode.StatusBarAlignment.Right,
    backgroundColor: new vscode.ThemeColor('statusBarItem.warningBackground'),
    command: 'mpx.action.doctor',
  })

  const activeTextEditor = useActiveTextEditor()
  const docChangeEvent = useEventEmitter<vscode.Uri>()

  watchEffect(updateStatusBar)

  useCommand('mpx.action.doctor', () => {
    const doc = activeTextEditor.value?.document
    if (
      doc &&
      (doc.languageId === 'mpx' || doc.uri.toString().endsWith('.mpx')) &&
      doc.uri.scheme === 'file'
    ) {
      executeCommand('markdown.showPreviewToSide', getDoctorUri(doc.uri))
    }
  })

  useDisposable(
    vscode.workspace.registerTextDocumentContentProvider(scheme, {
      onDidChange: docChangeEvent.event,
      async provideTextDocumentContent(doctorUri: vscode.Uri) {
        const fileUri = doctorUri.with({
          scheme: 'file',
          path: doctorUri.path.slice(0, -'/Doctor.md'.length),
        })
        const problems = await getProblems(fileUri)

        let content = `# ${fileUri.path.split('/').pop()} Doctor\n\n`

        for (const problem of problems) {
          content += '## ❗ ' + problem.title + '\n\n'
          content += problem.message + '\n\n'
        }

        content += '---\n\n'
        return content.trim()
      },
    }),
  )

  function getDoctorUri(fileUri: vscode.Uri) {
    return fileUri.with({ scheme, path: fileUri.path + '/Doctor.md' })
  }

  async function updateStatusBar() {
    const editor = activeTextEditor.value
    if (
      config.doctor.status &&
      editor &&
      (editor.document.languageId === 'mpx' ||
        editor.document.uri.toString().endsWith('.mpx')) &&
      editor.document.uri.scheme === 'file'
    ) {
      const problems = await getProblems(editor.document.uri)
      if (
        problems.length &&
        vscode.window.activeTextEditor?.document === editor.document
      ) {
        item.show()
        item.text =
          problems.length +
          (problems.length === 1 ? ' known issue' : ' known issues')
        docChangeEvent.fire(getDoctorUri(editor.document.uri))
      }
    } else {
      item.hide()
    }
  }

  async function getProblems(fileUri: vscode.Uri) {
    const mpxDoc = vscode.workspace.textDocuments.find(
      doc => doc.fileName === fileUri.fsPath,
    )

    const sfc: SFCParseResult = mpxDoc
      ? await client.sendRequest(ExecuteCommandRequest.type, {
          command: commands.parseSfc,
          arguments: [mpxDoc.getText()],
        } satisfies ExecuteCommandParams)
      : undefined

    const problems: {
      title: string
      message: string
    }[] = []

    // check syntax highlight extension installed
    if (sfc) {
      const blocks = [
        sfc.descriptor.template,
        sfc.descriptor.script,
        sfc.descriptor.scriptSetup,
        ...sfc.descriptor.styles,
        ...sfc.descriptor.customBlocks,
      ]
      for (const block of blocks) {
        if (!block) {
          continue
        }
        if (block.lang && block.lang in knownValidSyntaxHighlightExtensions) {
          const validExts =
            knownValidSyntaxHighlightExtensions[
              block.lang as keyof typeof knownValidSyntaxHighlightExtensions
            ]
          const someInstalled = validExts.some(
            ext => !!vscode.extensions.getExtension(ext),
          )
          if (!someInstalled) {
            problems.push({
              title: 'Syntax Highlighting for ' + block.lang,
              message:
                `Did not find a valid syntax highlighter extension for ${block.lang} language block; you can choose to install one of the following:\n\n` +
                validExts.map(
                  ext =>
                    `- [${ext}](https://marketplace.visualstudio.com/items?itemName=${ext})\n`,
                ),
            })
          }
        }
      }
    }

    // check tsdk > 5.0.0
    const tsdk = (await getTsdk(extensionContext.value!))!
    if (tsdk.version && !semver.gte(tsdk.version, '5.0.0')) {
      problems.push({
        title: 'Requires TSDK 5.0 or higher',
        message: `Extension >= 2.0 requires TSDK 5.0+. You are currently using TSDK ${tsdk.version}, please upgrade to TSDK.`,
      })
    }

    return problems
  }
}
