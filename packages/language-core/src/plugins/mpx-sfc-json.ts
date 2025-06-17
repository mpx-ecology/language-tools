import type { MpxLanguagePlugin } from '../types'
// import { allCodeFeatures } from './shared'
// import { allCodeFeatures } from './shared'

const plugin: MpxLanguagePlugin = () => {
  return {
    name: 'mpx-sfc-json',
    getEmbeddedCodes(_fileName, sfc) {
      const result: {
        id: string
        lang: string
      }[] = []
      if (sfc.json) {
        const json = sfc.json
        result.push({
          id: 'mpx_json',
          lang: json.lang,
        })
      }
      return result
    },

    resolveEmbeddedCode(_fileName, sfc, embeddedFile) {
      if (embeddedFile.id === 'mpx_json' && sfc.json) {
        embeddedFile.content.push([
          sfc.json.content,
          sfc.json.name,
          0,
          {
            verification: true,
            completion: true,
            semantic: true,
            navigation: true,
          },
        ])
      }
    },
  }
}

export default plugin
