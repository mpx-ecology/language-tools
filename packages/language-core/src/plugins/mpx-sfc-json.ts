import type * as ts from 'typescript'
import type {
  MpxLanguagePlugin,
  SfcJsonBlockPages,
  SfcJsonBlockResolvedPages,
  SfcJsonBlockResolvedUsingComponents,
  SfcJsonBlockUsingComponents,
} from '../types'
import { generateJsonService } from '../codegen/script/jsonService'
import { allCodeFeatures } from './shared'
import { createUsingComponentsPathResolver } from '../utils/formatUsingComponentsPath'

const plugin: MpxLanguagePlugin = ({
  modules,
  compilerOptions,
  mpxCompilerOptions,
}) => {
  const resolveComponentPath = createUsingComponentsPathResolver(
    compilerOptions,
    mpxCompilerOptions,
  )

  function resolveUsingComponentsPath(
    usingComponents: SfcJsonBlockUsingComponents,
    uri: string,
  ) {
    resolveComponentPath.retain(
      uri,
      'components',
      [...usingComponents.values()].flatMap(infos =>
        infos.map(info => info.text),
      ),
    )
    const result: SfcJsonBlockResolvedUsingComponents['result'] = new Map()
    const errors: SfcJsonBlockResolvedUsingComponents['errors'] = []

    for (const [name, componentInfos] of usingComponents) {
      for (const info of componentInfos) {
        if (!info.text) {
          continue
        }

        const { candidates, error } =
          resolveComponentPath(info.text, uri, 'components') || {}

        // 路径错误收集
        if (error) {
          errors.push(info)
        } else if (candidates?.length) {
          if (!result.has(name)) {
            result.set(name, [])
          }
          result
            .get(name)!
            .push(...candidates.map(candidate => ({ ...info, ...candidate })))
        }
      }
    }

    return { result, errors }
  }

  function resolvePagesPath(pages: SfcJsonBlockPages, uri: string) {
    resolveComponentPath.retain(
      uri,
      'pages',
      pages.map(info => info.text),
    )
    const result: SfcJsonBlockResolvedPages['result'] = []
    const errors: SfcJsonBlockResolvedPages['errors'] = []

    for (const info of pages) {
      if (!info.text) {
        continue
      }

      const { candidates, error } =
        resolveComponentPath(info.text, uri, 'pages') || {}

      if (error) {
        errors.push(info)
      } else if (candidates?.length) {
        result.push(...candidates.map(candidate => ({ ...info, ...candidate })))
      }
    }

    return { result, errors }
  }

  return {
    name: 'mpx-sfc-json',
    requiredCompilerOptions: [
      'baseUrl',
      'paths',
      'pathsBasePath',
      'configFilePath',
    ],
    getExternalDependencyVersion: resolveComponentPath.getVersion,

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
        if (lang === 'js') {
          result.push({ id: 'json_service', lang: 'js' })
        }
      }
      return result
    },

    resolveEmbeddedCode(_fileName, sfc, embeddedFile) {
      const json = sfc.json
      if (!json) return
      if (embeddedFile.id === 'json_service' && json.lang === 'js') {
        embeddedFile.content.push(
          ...generateJsonService(modules.typescript, json),
        )
      } else if (/^json_(js|json)$/.test(embeddedFile.id)) {
        // Keep every offset relative to the unmodified block, including CRLF.
        embeddedFile.content.push([json.content, json.name, 0, allCodeFeatures])
      }
    },

    resolveUsingComponentsPath,
    resolvePagesPath,
  }
}

export default plugin
