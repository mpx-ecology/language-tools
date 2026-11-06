import type { Code, ResolvedUsingComponentInfo } from '../../types'
import type { ScriptCodegenOptions } from './index'
import { camelize, capitalize } from '@mpxjs/language-shared'
import * as path from 'path-browserify'
import { endOfLine, newLine } from '../utils'
import { identifierRegex } from '../utils'

export function* generateJsonComponents(
  options: ScriptCodegenOptions,
): Generator<Code> {
  const candidates = getComponentCandidates(options)
  yield* generateJsonPathCompletionImports(options, candidates)
  yield* generateJsonUsingComponents(candidates)
}

function* generateJsonUsingComponents(
  usingComponents: ReturnType<typeof getComponentCandidates>,
): Generator<Code> {
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

function* generateJsonPathCompletionImports(
  options: ScriptCodegenOptions,
  candidates: ReturnType<typeof getComponentCandidates>,
): Generator<Code> {
  const localComponents = options.sfc.json?.usingComponents
  const usingComponents = options.sfc.usingComponents ?? localComponents
  const jsonStart = (options.sfc.json?.startTagEnd || 0) + 1
  const pages = options.sfc.json?.pages
  const application = options.sfc.application

  yield `// Virtual imports for JSON path completion${newLine}`

  if (usingComponents?.size) {
    for (const [componentIndex, [componentName, componentPaths]] of [
      ...usingComponents,
    ].entries()) {
      const local = localComponents?.get(componentName)
      const importPaths = (candidates?.get(componentName) ?? []).map(
        candidate =>
          getResolvedImportPath(options.fileName, candidate) ??
          (!local && application && candidate.text.startsWith('.')
            ? path.resolve(path.dirname(application.fileName), candidate.text)
            : candidate.text),
      )
      const mappedOffsets: (number | undefined)[] = []
      for (const info of componentPaths) {
        // The original registration in an app belongs to that app's document.
        if (!local?.includes(info)) continue
        const offset = jsonStart + info.offset
        const index = importPaths.indexOf(info.text)
        if (
          index >= 0 &&
          mappedOffsets[index] === undefined &&
          JSON.stringify(info.text).slice(1, -1) === info.text
        ) {
          // The same module literal already supplies component types.
          mappedOffsets[index] = offset
          continue
        }
        yield `import '`
        yield jsonPathMapping(info.text, offset)
        yield `'${newLine}`
      }
      for (const [i, importPath] of importPaths.entries()) {
        const importName = getUsingComponentImportName(componentIndex, i)
        const offset = mappedOffsets[i]
        if (offset === undefined) {
          yield `import ${importName} from ${JSON.stringify(importPath)}${newLine}`
        } else {
          yield `import ${importName} from "`
          yield jsonPathMapping(importPath, offset)
          yield `"${newLine}`
        }
      }
    }
  }

  // todo：为 pages 生成虚拟 import，留窗口
  if (pages?.length) {
    for (let i = 0; i < pages.length; i++) {
      const page = pages[i]
      yield `import __mpx_page_path_completion_${i} from '`

      yield jsonPathMapping(page.text, jsonStart + page.offset)

      yield `'${newLine}`
    }
  }

  yield `${newLine}`
}

const pathCompletion = {
  completion: true,
  navigation: false,
  semantic: false,
  verification: false,
  structure: false,
  format: false,
}

function jsonPathMapping(text: string, offset: number): Code {
  return [text, 'json_import', offset, pathCompletion]
}

/** Keep source registrations intact, but import each actual type source once. */
function getComponentCandidates(options: ScriptCodegenOptions) {
  const usingComponents =
    options.sfc.usingComponents ?? options.sfc.json?.usingComponents
  if (!usingComponents) return
  const resolved =
    options.sfc.resolvedUsingComponents?.result ??
    options.sfc.json?.resolvedUsingComponents?.result
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
