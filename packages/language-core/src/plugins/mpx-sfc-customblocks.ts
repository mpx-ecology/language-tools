import type { MpxLanguagePlugin } from '../types'
import { allCodeFeatures } from './shared'

const plugin: MpxLanguagePlugin = () => {
  return {
    name: 'mpx-sfc-customblocks',

    getEmbeddedCodes(_fileName, sfc) {
      return sfc.customBlocks.map((customBlock, i) => ({
        id: 'custom_block_' + i,
        lang: customBlock.lang,
      }))
    },

    resolveEmbeddedCode(_fileName, sfc, embeddedFile) {
      if (embeddedFile.id.startsWith('custom_block_')) {
        const index = parseInt(embeddedFile.id.slice('custom_block_'.length))
        const customBlock = sfc.customBlocks[index]

        embeddedFile.content.push([
          customBlock.content,
          customBlock.name,
          0,
          allCodeFeatures,
        ])
      }
    },
  }
}

export default plugin
