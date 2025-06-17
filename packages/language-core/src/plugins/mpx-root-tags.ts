import type { MpxLanguagePlugin } from '../types'
import { replaceSourceRange } from 'muggle-string'
import { allCodeFeatures } from './shared'

const plugin: MpxLanguagePlugin = () => {
  return {
    name: 'mpx-root-tags',
    getEmbeddedCodes() {
      return [
        {
          id: 'root_tags',
          lang: 'mpx-root-tags',
        },
      ]
    },

    resolveEmbeddedCode(_fileName, sfc, embeddedFile) {
      if (embeddedFile.id === 'root_tags') {
        embeddedFile.content.push([sfc.content, undefined, 0, allCodeFeatures])
        for (const block of [
          sfc.script,
          sfc.scriptSetup,
          sfc.template,
          sfc.json,
          ...sfc.styles,
          ...sfc.customBlocks,
        ]) {
          if (!block) {
            continue
          }
          let content = block.content
          if (content.endsWith('\r\n')) {
            content = content.slice(0, -2)
          } else if (content.endsWith('\n')) {
            content = content.slice(0, -1)
          }
          const offset = content.lastIndexOf('\n') + 1
          // fix folding range end position failed to mapping
          replaceSourceRange(
            embeddedFile.content,
            undefined,
            block.startTagEnd,
            block.endTagStart,
            sfc.content.slice(block.startTagEnd, block.startTagEnd + offset),
            ['', undefined, block.startTagEnd + offset, { structure: true }],
            sfc.content.slice(block.startTagEnd + offset, block.endTagStart),
          )
        }
      } else {
        embeddedFile.parentCodeId ??= 'root_tags'
      }
    },
  }
}

export default plugin
