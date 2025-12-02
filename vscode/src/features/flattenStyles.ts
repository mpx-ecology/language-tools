import type { SFCParseResult } from '@mpxjs/language-server'
import * as vscode from 'vscode'
import {
  type BaseLanguageClient,
  ExecuteCommandParams,
  ExecuteCommandRequest,
} from '@volar/vscode'
import { Commands } from '@mpxjs/language-server/out/types'
import { useActiveTextEditor, useCommand } from 'reactive-vscode'
import { flattenStylusRules } from '../utils/flattenStylusStyles'

type SFCBlock = SFCParseResult['descriptor']['customBlocks'][number]

export function activate(client: BaseLanguageClient) {
  const activeTextEditor = useActiveTextEditor()
  const getDocDescriptor = useDocDescriptor(client)

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

        const {
          code,
          // conflicts,
          // errors,
        } = flattenStylusRules(stylusContent)
        const flattened = `\n${code}\n`

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
    } catch (error) {
      console.error(
        `[Mpx] Command: Flatten Stylus for Mpx2RN Error: ${error instanceof Error ? error.message : String(error)}`,
      )
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
