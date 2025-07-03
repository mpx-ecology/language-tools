import type { MpxLanguagePlugin } from '../types'
import { allCodeFeatures } from './shared'

const plugin: MpxLanguagePlugin = () => {
  return {
    name: 'mpx-sfc-json',
    getEmbeddedCodes(_fileName, sfc) {
      const result: {
        id: string
        lang: string
      }[] = []
      if (sfc.json) {
        result.push({
          id: 'json_' + sfc.json.lang,
          lang: sfc.json.lang,
        })
      }
      return result
    },

    resolveEmbeddedCode(_fileName, sfc, embeddedFile) {
      const json = /json_(js|json)/.test(embeddedFile.id) ? sfc.json : undefined
      if (json) {
        let content = json.content
        if (content.startsWith('\n')) {
          content = content.slice(1)
        }
        embeddedFile.content.push([content, json.name, 1, allCodeFeatures])
      }
    },
  }
}

export default plugin
