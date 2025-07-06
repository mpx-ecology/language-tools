import type * as ts from 'typescript'
import type { MpxLanguagePlugin } from '../types'
import { allCodeFeatures } from './shared'

const plugin: MpxLanguagePlugin = ({ modules }) => {
  return {
    name: 'mpx-sfc-json',

    compileSFCJson(lang, json) {
      if (lang === 'js' || lang === 'json') {
        const ts = modules.typescript
        return ts.createSourceFile(
          `mpx_json.${lang}`,
          json,
          lang === 'json'
            ? (100 satisfies ts.ScriptTarget.JSON)
            : (99 satisfies ts.ScriptTarget.Latest),
        )
      }
    },

    getEmbeddedCodes(_fileName, sfc) {
      const result: {
        id: string
        lang: string
      }[] = []
      if (sfc.json) {
        const lang = sfc.json.lang
        result.push({
          id: `json_${lang}`,
          lang: lang,
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
