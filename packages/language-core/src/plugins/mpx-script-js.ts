import type * as ts from 'typescript'
import type { MpxLanguagePlugin } from '../types'

const plugin: MpxLanguagePlugin = ({ modules }) => {
  return {
    compileSFCScript(lang, script) {
      if (lang === 'js' || lang === 'ts' || lang === 'jsx' || lang === 'tsx') {
        const ts = modules.typescript
        return ts.createSourceFile(
          'test.' + lang,
          script,
          99 satisfies ts.ScriptTarget.Latest,
        )
      }
    },
  }
}

export default plugin
