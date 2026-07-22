import type * as ts from 'typescript'
import type {
  MpxLanguagePlugin,
  SfcJsonBlockPages,
  SfcJsonBlockResolvedPages,
  SfcJsonBlockResolvedUsingComponents,
  SfcJsonBlockUsingComponents,
} from '../types'
import { allCodeFeatures } from './shared'
import { createUsingComponentsPathResolver } from '../utils/formatUsingComponentsPath'

const plugin: MpxLanguagePlugin = ({ modules, compilerOptions }) => {
  const resolveComponentPath =
    createUsingComponentsPathResolver(compilerOptions)

  function resolveUsingComponentsPath(
    usingComponents: SfcJsonBlockUsingComponents,
    uri: string,
  ) {
    const result: SfcJsonBlockResolvedUsingComponents['result'] = new Map()
    const errors: SfcJsonBlockResolvedUsingComponents['errors'] = []

    for (const [name, componentInfos] of usingComponents) {
      for (const info of componentInfos) {
        if (!info.text) {
          continue
        }

        const { result: resolvedFilename, error } =
          resolveComponentPath(info.text, uri) || {}

        // 路径错误收集
        if (error) {
          errors.push(info)
        } else if (resolvedFilename) {
          if (!result.has(name)) {
            result.set(name, [])
          }
          result.get(name)!.push({
            ...info,
            realFilename: resolvedFilename,
          })
        }
      }
    }

    return { result, errors }
  }

  function resolvePagesPath(pages: SfcJsonBlockPages, uri: string) {
    const result: SfcJsonBlockResolvedPages['result'] = []
    const errors: SfcJsonBlockResolvedPages['errors'] = []

    for (const info of pages) {
      if (!info.text) {
        continue
      }

      const { result: resolvedFilename, error } =
        resolveComponentPath(info.text, uri) || {}

      if (error) {
        errors.push(info)
      } else if (resolvedFilename) {
        result.push({
          ...info,
          realFilename: resolvedFilename,
        })
      }
    }

    return { result, errors }
  }

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

    resolveUsingComponentsPath,
    resolvePagesPath,
  }
}

export default plugin
