import type {
  Code,
  SfcJsonBlockResolvedUsingComponents,
  UsingComponentInfo,
} from '../../types'
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
  const usingComponents = options.sfc.json?.usingComponents

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
  const resolvedUsingComponents = getResolvedUsingComponents(options)
  const jsonStart = (options.sfc.json?.startTagEnd || 0) + 1
  const pages = options.sfc.json?.pages

  // 生成虚拟的 import 语句用于路径补全
  yield `// Virtual imports for JSON path completion${newLine}`

  // 为 usingComponents 生成虚拟 import
  if (usingComponents?.size) {
    for (const [componentIndex, [componentName, componentPaths]] of [
      ...usingComponents,
    ].entries()) {
      for (let i = 0; i < componentPaths.length; i++) {
        const componentPathInfo = componentPaths[i]!
        const importName = getUsingComponentImportName(componentIndex, i)
        const resolvedImportPath = getResolvedImportPath(
          options.fileName,
          componentName,
          componentPathInfo,
          resolvedUsingComponents,
        )

        if (
          resolvedImportPath &&
          resolvedImportPath !== componentPathInfo.text
        ) {
          // Keep a source-mapped side-effect import for JSON path completion.
          // The separately generated named import points at the resolved Mpx
          // file and supplies the component type used by template codegen.
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
          yield `import ${importName} from ${JSON.stringify(resolvedImportPath)}${newLine}`
          continue
        }

        // Keep generated imports in a reserved internal namespace so a JSON
        // component name cannot collide with user script bindings.
        yield `import ${importName} from '`

        // 传递原始路径及位置信息
        yield [
          componentPathInfo.text,
          'json_import',
          jsonStart + componentPathInfo.offset,
          {
            // 仅启用补全功能，不参与语义分析等
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

function getResolvedUsingComponents(
  options: ScriptCodegenOptions,
): SfcJsonBlockResolvedUsingComponents['result'] | undefined {
  return options.sfc.json?.resolvedUsingComponents?.result
}

function getResolvedImportPath(
  importer: string,
  componentName: string,
  componentPathInfo: UsingComponentInfo,
  resolvedUsingComponents:
    | SfcJsonBlockResolvedUsingComponents['result']
    | undefined,
) {
  const resolvedInfo = resolvedUsingComponents
    ?.get(componentName)
    ?.find(
      info =>
        info.offset === componentPathInfo.offset &&
        info.text === componentPathInfo.text,
    )
  const realFilename = resolvedInfo?.realFilename

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
