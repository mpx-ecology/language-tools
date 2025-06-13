import type { MpxLanguagePlugin } from '../types'

const plugin: MpxLanguagePlugin = ({ modules }) => {
  return {
    name: 'mpx-script-js',

    compileSFCScript(lang, script) {
      if (lang === 'js' || lang === 'ts' || lang === 'jsx' || lang === 'tsx') {
        const ts = modules.typescript
        return ts.createSourceFile(
          `mpx_script.${lang}`,
          script,
          ts.ScriptTarget.Latest,
        )
      }
    },
  }
}

export default plugin
