import type { Code } from '../../types'
import type { ScriptCodegenOptions } from './index'
import type { ScriptCodegenContext } from './context'
import { camelize, capitalize } from '@mpxjs/language-shared'
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

  for (const [componentName, componentPaths] of usingComponents) {
    const firstImportName = getUsingComponentImportName(componentName, 0)
    yield `${firstImportName}`
    if (componentPaths.length > 1) {
      // Multiple resolved paths still need a single runtime value, so keep the
      // first import as the value and widen its type to all candidate imports.
      yield ` as `
      for (let i = 0; i < componentPaths.length; i++) {
        if (i) {
          yield ` | `
        }
        yield `typeof ${getUsingComponentImportName(componentName, i)}`
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
  const jsonStart = (options.sfc.json?.startTagEnd || 0) + 1
  const pages = options.sfc.json?.pages

  // 生成虚拟的 import 语句用于路径补全
  yield `// Virtual imports for JSON path completion${newLine}`

  // 为 usingComponents 生成虚拟 import
  if (usingComponents?.size) {
    for (const [componentName, componentPaths] of usingComponents) {
      for (let i = 0; i < componentPaths.length; i++) {
        const componentPathInfo = componentPaths[i]!
        const importName = getUsingComponentImportName(componentName, i)

        // Generate a virtual import with a stable identifier so the generated
        // component map reads like normal source imports instead of index-based
        // placeholders.
        yield `import ${importName} from '`

        // 传递原始路径及位置信息
        yield [
          componentPathInfo.text,
          'json_import',
          jsonStart + componentPathInfo.offset,
          {
            // 仅启用补全功能，不参与语义分析等
            completion: true,
            navigation: true, // 需要导航功能来支持跳转
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
          navigation: true,
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

export function getUsingComponentImportName(
  componentName: string,
  index: number,
) {
  const camelizedName = capitalize(camelize(componentName))
  const baseName =
    camelizedName && identifierRegex.test(camelizedName)
      ? camelizedName
      : `component_${index}`
  return `${baseName}`
}
