import type { Code } from '../../types'
import type { ScriptCodegenOptions } from './index'
import type { ScriptCodegenContext } from './context'
import { endOfLine, newLine } from '../utils'
import { codeFeatures } from '../codeFeatures'

export function* generateJsonUsingComponents(
  options: ScriptCodegenOptions,
  _ctx: ScriptCodegenContext,
): Generator<Code> {
  const usingComponents = options.sfc.json?.usingComponents

  if (!usingComponents?.size) {
    return
  }

  yield `type __MPX_jsonComponents = {${newLine}`

  for (const [componentName, componentPaths] of usingComponents) {
    for (const {
      text: componentPath,
      offset: componentPathOffset,
      // nameOffset: componentNameOffset,
    } of componentPaths) {
      yield `${componentName}: typeof import('`

      yield [
        componentPath,
        'scriptSetup',
        componentPathOffset,
        codeFeatures.all,
      ]
    }

    yield `)'${newLine}`
  }

  yield `}${endOfLine}`
}

// 新增函数：生成用于路径补全的虚拟 import 代码
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
    let index = 0
    for (const [componentName, componentPaths] of usingComponents) {
      for (const {
        text: componentPath,
        offset: componentPathOffset,
      } of componentPaths) {
        // 生成虚拟 import 语句，带特殊标记以便识别
        yield `import __mpx_path_completion_${index++} from '`

        // 传递原始路径及位置信息
        yield [
          componentPath,
          'json_import',
          jsonStart + componentPathOffset,
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
        page.offset,
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
