import type * as ts from 'typescript'
import type { MpxLanguagePlugin } from '../types'

const plugin: MpxLanguagePlugin = ({ modules }) => {
  return {
    name: 'mpx-script-js',

    compileSFCScript(lang, script) {
      if (lang === 'js' || lang === 'ts') {
        const ts = modules.typescript
        return ts.createSourceFile(
          `mpx_script.${lang}`,
          script,
          99 satisfies ts.ScriptTarget.Latest,
        )
      }
    },
  }
}

export default plugin
