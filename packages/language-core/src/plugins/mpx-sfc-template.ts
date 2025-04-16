import type { MpxLanguagePlugin } from '../types'
import { allCodeFeatures } from './shared'

const plugin: MpxLanguagePlugin = () => {
  return {
    version: 2.1,

    getEmbeddedCodes(_fileName, sfc) {
      if (sfc.template?.lang === 'html') {
        return [
          {
            id: 'template',
            lang: sfc.template.lang,
          },
        ]
      }
      return []
    },

    resolveEmbeddedCode(_fileName, sfc, embeddedFile) {
      if (embeddedFile.id === 'template' && sfc.template?.lang === 'html') {
        embeddedFile.content.push([
          sfc.template.content,
          sfc.template.name,
          0,
          allCodeFeatures,
        ])
      }
    },
  }
}

export default plugin
