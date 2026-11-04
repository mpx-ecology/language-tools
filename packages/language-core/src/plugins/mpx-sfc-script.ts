import type { MpxLanguagePlugin } from '../types'

const plugin: MpxLanguagePlugin = () => {
  return {
    name: 'mpx-sfc-scripts',

    getEmbeddedCodes(_fileName, sfc) {
      const names: {
        id: string
        lang: string
      }[] = []
      if (sfc.script) {
        names.push({ id: 'script_raw', lang: sfc.script.lang })
      }
      if (sfc.scriptSetup) {
        names.push({ id: 'scriptsetup_raw', lang: sfc.scriptSetup.lang })
        names.push({
          id: 'scriptsetup_diagnostics',
          lang: 'mpx-instance-fields',
        })
      }
      return names
    },

    resolveEmbeddedCode(_fileName, sfc, embeddedFile) {
      if (embeddedFile.id === 'scriptsetup_diagnostics' && sfc.scriptSetup) {
        embeddedFile.content.push([
          sfc.scriptSetup.content,
          'scriptSetup',
          0,
          { verification: true },
        ])
        return
      }
      const script =
        embeddedFile.id === 'script_raw'
          ? sfc.script
          : embeddedFile.id === 'scriptsetup_raw'
            ? sfc.scriptSetup
            : undefined
      if (script) {
        embeddedFile.content.push([
          script.content,
          script.name,
          0,
          {
            structure: true,
            format: true,
          },
        ])
      }
    },
  }
}

export default plugin
