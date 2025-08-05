import type { MpxLanguagePlugin } from '../types'
import { allCodeFeatures } from './shared'

const plugin: MpxLanguagePlugin = () => {
  return {
    name: 'mpx-sfc-styles',

    getEmbeddedCodes(_fileName, sfc) {
      const result: {
        id: string
        lang: string
      }[] = []
      for (let i = 0; i < sfc.styles.length; i++) {
        const style = sfc.styles[i]
        if (style) {
          result.push({
            id: 'style_' + i,
            lang: style.lang,
          })
        }
      }
      return result
    },

    resolveEmbeddedCode(_fileName, sfc, embeddedFile) {
      if (embeddedFile.id.startsWith('style_')) {
        const index = parseInt(embeddedFile.id.split('_')[1])
        const style = sfc.styles[index]
        embeddedFile.content.push([
          style.content,
          style.name,
          0,
          allCodeFeatures,
        ])
      }
    },
  }
}

export default plugin
