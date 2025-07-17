import type * as ts from 'typescript'
import type {
  MpxLanguagePlugin,
  SfcJsonBlockUsingComponents,
  SfcJsonResolvedBlockUsingComponents,
} from '../types'
import { allCodeFeatures } from './shared'
import { withResolvers } from '../utils/utils'
import { formatUsingComponentsPath } from '../utils/formatUsingComponentsPath'

const plugin: MpxLanguagePlugin = ({ modules, compilerOptions }) => {
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

    resolveUsingComponentsPath(
      usingComponents: SfcJsonBlockUsingComponents,
      uri: string,
    ) {
      const { promise, resolve } =
        withResolvers<SfcJsonResolvedBlockUsingComponents>()
      const result: SfcJsonResolvedBlockUsingComponents['result'] = new Map()
      const errors: SfcJsonResolvedBlockUsingComponents['errors'] = []

      Promise.allSettled(
        [...usingComponents.entries()].map(async ([name, info]) => {
          await Promise.allSettled(
            info.map(async info => {
              if (!info.text) {
                return
              }

              const { result: resolvedFilename, error } =
                (await formatUsingComponentsPath(
                  info.text,
                  uri,
                  compilerOptions,
                )) || {}

              // 路径错误收集
              if (error) {
                errors.push(info)
                return
              } else if (resolvedFilename) {
                if (!result.has(name)) {
                  result.set(name, [])
                }
                result.get(name)!.push({
                  ...info,
                  realFilename: resolvedFilename,
                })
              }
            }),
          )
        }),
      ).then(() => resolve({ result, errors }))

      return promise
    },
  }
}

export default plugin
