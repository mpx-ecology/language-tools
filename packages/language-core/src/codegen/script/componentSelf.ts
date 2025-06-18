import type { Code } from '../../types'
import type { ScriptCodegenOptions } from './index'
import { endOfLine } from '../utils'

export function* generateComponentSelf(
  options: ScriptCodegenOptions,
): Generator<Code> {
  if (options.sfc.scriptSetup) {
    if (options.scriptSetupRanges?.defineExpose) {
      yield `const __VLS_self = typeof __VLS_defineExpose${endOfLine}`
    } else {
      yield `const __VLS_self = {}${endOfLine}`
    }
  } else {
    yield `const __VLS_self = typeof __VLS_defineComponent${endOfLine}`
  }
  yield `export default __VLS_self${endOfLine}`
}
