import type { MpxLanguagePlugin } from '../types'
import { parse } from '../utils/parseSfc'

const plugin: MpxLanguagePlugin = ({ mpxCompilerOptions }) => {
  return {
    name: 'mpx-file',

    getLanguageId(fileName) {
      if (mpxCompilerOptions.extensions.some(ext => fileName.endsWith(ext))) {
        return 'mpx'
      }
    },

    isValidFile(_fileName, languageId) {
      return languageId === 'mpx'
    },

    parseSFC(_fileName, languageId, content) {
      if (languageId !== 'mpx') {
        return
      }

      return parse(content)
    },

    updateSFC(sfc, change) {
      const blocks = [
        sfc.descriptor.template,
        sfc.descriptor.script,
        sfc.descriptor.scriptSetup,
        sfc.descriptor.json,
        ...sfc.descriptor.styles,
        ...sfc.descriptor.customBlocks,
      ].filter(block => !!block)

      const hitBlock = blocks.find(
        block =>
          change.start >= block.loc.start.offset &&
          change.end <= block.loc.end.offset,
      )
      if (!hitBlock) {
        return
      }

      const oldContent = hitBlock.content
      const newContent = (hitBlock.content =
        hitBlock.content.slice(0, change.start - hitBlock.loc.start.offset) +
        change.newText +
        hitBlock.content.slice(change.end - hitBlock.loc.start.offset))

      const endTagRegex = new RegExp(`</\\s*${hitBlock.type}\\s*>`)
      const insertedEndTag =
        endTagRegex.test(oldContent) !== endTagRegex.test(newContent)
      if (insertedEndTag) {
        return
      }

      const lengthDiff = change.newText.length - (change.end - change.start)

      for (const block of blocks) {
        if (block.loc.start.offset > change.end) {
          block.loc.start.offset += lengthDiff
        }
        if (block.loc.end.offset >= change.end) {
          block.loc.end.offset += lengthDiff
        }
      }

      return sfc
    },
  }
}

export default plugin
