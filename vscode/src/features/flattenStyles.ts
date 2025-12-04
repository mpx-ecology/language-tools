import type { SFCParseResult } from '@mpxjs/language-server'
import * as vscode from 'vscode'
import {
  type BaseLanguageClient,
  ExecuteCommandParams,
  ExecuteCommandRequest,
} from '@volar/vscode'
import { Commands } from '@mpxjs/language-server/out/types'
import { useActiveTextEditor, useCommand } from 'reactive-vscode'
import {
  flattenStylusRules,
  formatConflicts,
  formatErrors,
} from '../utils/flattenStylusStyles'

type SFCBlock = SFCParseResult['descriptor']['customBlocks'][number]

export function activate(client: BaseLanguageClient) {
  const activeTextEditor = useActiveTextEditor()
  const getDocDescriptor = useDocDescriptor(client)

  const outputChannel =
    client.outputChannel ?? vscode.window.createOutputChannel('Mpx2RN')

  useCommand('mpx.action.flattenStyles', async () => {
    try {
      const editor = activeTextEditor.value
      if (!editor) {
        return
      }
      const doc = editor.document
      const descriptor = (await getDocDescriptor(doc.getText()))?.descriptor
      if (!descriptor) {
        return
      }

      const styleBlocks: SFCBlock[] = descriptor.styles || []
      const conflictsAll = []
      const errorsAll = []
      // 同时替换多个 stylus 块时，后续块的位置会变化，需要记录偏移量，否则位置不对 replace 也不会生效
      let replaceOffset = 0

      for (const styleBlock of styleBlocks) {
        if (styleBlock.lang !== 'stylus') {
          continue
        }
        const stylusContent = styleBlock.content
        if (!stylusContent.length || stylusContent.length === 0) {
          continue
        }
        const styleBlockStartedLine =
          doc.positionAt(styleBlock.loc.start.offset).line + 1

        const {
          code = '',
          conflicts = [],
          errors = [],
        } = flattenStylusRules(stylusContent)
        const flattened = `\n${code}\n`
        conflicts.forEach(item => {
          item.locations.forEach(loc => {
            if (loc.outputLine) {
              loc.outputLine += styleBlockStartedLine
            }
          })
        })
        errors.forEach(item => {
          if (item.outputLine) {
            item.outputLine += styleBlockStartedLine
          }
        })
        conflictsAll.push(...conflicts)
        errorsAll.push(...errors)

        if (flattened !== stylusContent) {
          const start = styleBlock.loc.start.offset + replaceOffset
          const end = styleBlock.loc.end.offset + replaceOffset
          const fullRange = new vscode.Range(
            doc.positionAt(start),
            doc.positionAt(end),
          )
          await editor.edit(editBuilder => {
            editBuilder.replace(fullRange, flattened)
          })
          replaceOffset += flattened.length - (end - start)
        }
      }

      outputChannel.appendLine(
        `\n[Mpx2RN] Flatten stylus styles complete. [${new Date().toLocaleString()}]`,
      )
      outputChannel.appendLine(formatConflicts(conflictsAll, doc.uri.fsPath))
      outputChannel.appendLine(formatErrors(errorsAll, doc.uri.fsPath))
      outputChannel.appendLine(
        '📖 目前仅支持 stylus 拍平, 更多 Mpx2RN 样式规范请参考: https://mpxjs.cn/guide/rn/style.html',
      )
      outputChannel.hide()
      outputChannel.show()
    } catch (error) {
      const errorMsg = `[Mpx] Error in flatten styles command: ${error instanceof Error ? error.message : String(error)}`
      outputChannel.appendLine(errorMsg)
      outputChannel.appendLine('\n')
      outputChannel.hide()
      outputChannel.show()
    }
  })
}

export function useDocDescriptor(client: BaseLanguageClient) {
  let splitDocText: string | undefined
  let splitDocDescriptor: SFCParseResult | undefined

  return getDescriptor

  async function getDescriptor(text: string) {
    if (text !== splitDocText) {
      splitDocText = text
      splitDocDescriptor = await client.sendRequest(
        ExecuteCommandRequest.type,
        {
          command: Commands.ParseSfc,
          arguments: [text],
        } satisfies ExecuteCommandParams,
      )
    }
    return splitDocDescriptor
  }
}
