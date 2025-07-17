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
