import type { Code, ResolvedUsingComponentInfo } from '../../types'
import type { ScriptCodegenOptions } from './index'
import type { ScriptCodegenContext } from './context'
import { camelize, capitalize } from '@mpxjs/language-shared'
import * as path from 'path-browserify'
import { endOfLine, newLine } from '../utils'
import { identifierRegex } from '../utils'

export function* generateJsonUsingComponents(
  options: ScriptCodegenOptions,
  _ctx: ScriptCodegenContext,
): Generator<Code> {
  const usingComponents = getComponentCandidates(options)

  if (!usingComponents?.size) {
    yield `const __MPX_jsonComponents = {}${endOfLine}`
    return
  }

  yield `const __MPX_jsonComponents = {${newLine}`

  const componentsByPropertyName = new Map<
    string,
    { componentIndex: number; candidateCount: number }[]
  >()
  for (const [componentIndex, [componentName, componentPaths]] of [
    ...usingComponents,
  ].entries()) {
    const componentPropertyName = getUsingComponentPropertyName(
      componentName,
      componentIndex,
    )
    let components = componentsByPropertyName.get(componentPropertyName)
    if (!components) {
      componentsByPropertyName.set(componentPropertyName, (components = []))
    }
    components.push({
      componentIndex,
      candidateCount: componentPaths.length,
    })
  }

  for (const [componentPropertyName, components] of componentsByPropertyName) {
    const importNames = components.flatMap(
      ({ componentIndex, candidateCount }) =>
        Array.from({ length: candidateCount }, (_, candidateIndex) =>
          getUsingComponentImportName(componentIndex, candidateIndex),
        ),
    )
    const firstImportName = importNames[0]!
    yield `${componentPropertyName}: ${firstImportName}`
    if (importNames.length > 1) {
      // Multiple paths or normalized component names still need a single
      // runtime value, so keep the first import and widen it to all candidates.
      yield ` as `
      for (let i = 0; i < importNames.length; i++) {
        if (i) {
          yield ` | `
        }
        yield `typeof ${importNames[i]}`
      }
    }
    yield `,${newLine}`
  }

  yield `}${endOfLine}`
}

export function* generateJsonPathCompletionImports(
  options: ScriptCodegenOptions,
  _ctx: ScriptCodegenContext,
): Generator<Code> {
  const usingComponents = options.sfc.json?.usingComponents
  const candidates = getComponentCandidates(options)
  const jsonStart = (options.sfc.json?.startTagEnd || 0) + 1
  const pages = options.sfc.json?.pages

  // 生成虚拟的 import 语句用于路径补全
  yield `// Virtual imports for JSON path completion${newLine}`

  // 为 usingComponents 生成虚拟 import
  if (usingComponents?.size) {
    for (const [componentIndex, [componentName, componentPaths]] of [
      ...usingComponents,
    ].entries()) {
      // One completion mapping for each original request, independent of how
      // many platform files supply types. Never duplicate semantic/navigation maps.
      for (const componentPathInfo of componentPaths) {
        yield `import '`
        yield [
          componentPathInfo.text,
          'json_import',
          jsonStart + componentPathInfo.offset,
          {
            completion: true,
            navigation: false,
            semantic: false,
            verification: false,
            structure: false,
            format: false,
          },
        ]
        yield `'${newLine}`
      }
      const componentCandidates = candidates?.get(componentName) ?? []
      for (let i = 0; i < componentCandidates.length; i++) {
        const candidate = componentCandidates[i]!
        const importName = getUsingComponentImportName(componentIndex, i)
        const importPath =
          getResolvedImportPath(options.fileName, candidate) ?? candidate.text
        yield `import ${importName} from ${JSON.stringify(importPath)}${newLine}`
      }
    }
  }

  // todo：为 pages 生成虚拟 import，留窗口
  if (pages?.length) {
    for (let i = 0; i < pages.length; i++) {
      const page = pages[i]
      yield `import __mpx_page_path_completion_${i} from '`

      yield [
        page.text,
        'json_import',
        jsonStart + page.offset,
        {
          completion: true,
          navigation: false,
          semantic: false,
          verification: false,
          structure: false,
          format: false,
        },
      ]

      yield `'${newLine}`
    }
  }

  yield `${newLine}`
}

/** Keep source registrations intact, but import each actual type source once. */
function getComponentCandidates(options: ScriptCodegenOptions) {
  const usingComponents = options.sfc.json?.usingComponents
  if (!usingComponents) return
  const resolved = options.sfc.json?.resolvedUsingComponents?.result
  return new Map(
    [...usingComponents].map(([name, paths]) => {
      const candidates = new Map<string, ResolvedUsingComponentInfo>()
      for (const info of paths) {
        const matches = resolved
          ?.get(name)
          ?.filter(
            candidate =>
              candidate.offset === info.offset && candidate.text === info.text,
          )
        const sources: ResolvedUsingComponentInfo[] = matches?.length
          ? matches
          : [info]
        for (const candidate of sources) {
          const key = candidate.realFilename ?? candidate.text
          if (!candidates.has(key)) candidates.set(key, candidate)
        }
      }
      return [name, [...candidates.values()]] as const
    }),
  )
}

function getResolvedImportPath(
  importer: string,
  info: ResolvedUsingComponentInfo,
) {
  const realFilename = info.realFilename

  if (!realFilename || realFilename.startsWith('plugin://')) {
    return
  }

  let importPath = path
    .relative(path.dirname(importer), realFilename)
    .replace(/\\/g, '/')

  if (!importPath) {
    importPath = path.basename(realFilename)
  }
  if (!importPath.startsWith('./') && !importPath.startsWith('../')) {
    importPath = `./${importPath}`
  }

  return importPath
}

function getUsingComponentPropertyName(
  componentName: string,
  componentIndex: number,
) {
  const camelizedName = capitalize(camelize(componentName))
  return camelizedName && identifierRegex.test(camelizedName)
    ? camelizedName
    : `component_${componentIndex}`
}

export function getUsingComponentImportName(
  componentIndex: number,
  candidateIndex: number,
) {
  return `__MPX_jsonComponent_${componentIndex}_${candidateIndex}`
}
