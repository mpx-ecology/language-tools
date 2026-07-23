import type { Code } from '../../types'
import type { ScriptCodegenOptions } from './index'
import { endOfLine, newLine } from '../utils'

export function* generateComponentSelf(
  options: ScriptCodegenOptions,
): Generator<Code> {
  if (options.sfc.scriptSetup) {
    yield `type __VLS_SelfBase = `
    if (options.scriptSetupRanges?.defineExpose) {
      yield `typeof __VLS_defineExpose`
    } else {
      yield `{}`
    }
    yield endOfLine
    yield `type __VLS_SelfComponent = __VLS_SelfBase & {${newLine}`
    yield `  new (props: __VLS_PublicProps): __VLS_SelfBase & {${newLine}`
    yield `    $props: __VLS_PublicProps${endOfLine}`
    yield `  }${newLine}`
    yield `}${endOfLine}`
    yield `const __VLS_self = {} as __VLS_SelfComponent${endOfLine}`
  } else {
    yield `type __VLS_SelfProps = __VLS_GetPropsType<typeof __VLS_rawProperties>${endOfLine}`
    yield `type __VLS_SelfBase = [typeof __VLS_defineComponent] extends [never] ? {} : typeof __VLS_defineComponent${endOfLine}`
    yield `type __VLS_SelfComponent = __VLS_SelfBase & {${newLine}`
    yield `  new (props: __VLS_SelfProps): __VLS_SelfBase & {${newLine}`
    yield `    $props: __VLS_SelfProps${endOfLine}`
    yield `  }${newLine}`
    yield `}${endOfLine}`
    yield `const __VLS_self = {} as __VLS_SelfComponent${endOfLine}`
  }
  yield `export default __VLS_self${endOfLine}`
}
