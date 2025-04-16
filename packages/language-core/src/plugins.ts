import mpxFilePlugin from './plugins/mpx-file'
import mpxRootTagsPlugin from './plugins/mpx-root-tags'
import mpxScriptJsPlugin from './plugins/mpx-script-js'
import mpxSfcCustomBlocksPlugin from './plugins/mpx-sfc-customblocks'
import mpxSfcScriptsFormatPlugin from './plugins/mpx-sfc-scripts'
import mpxSfcStylesPlugin from './plugins/mpx-sfc-styles'
import mpxSfcTemplatePlugin from './plugins/mpx-sfc-template'
import mpxTemplateHtmlPlugin from './plugins/mpx-template-html'
import mpxTemplateInlineCssPlugin from './plugins/mpx-template-inline-css'
import mpxTemplateInlineTsPlugin from './plugins/mpx-template-inline-ts'
import mpxTsxPlugin from './plugins/mpx-tsx'
import { validVersions, type MpxLanguagePlugin } from './types'

export * from './plugins/shared'

export function createPlugins(pluginContext: Parameters<MpxLanguagePlugin>[0]) {
  const plugins: MpxLanguagePlugin[] = [
    mpxFilePlugin,
    mpxRootTagsPlugin,
    mpxScriptJsPlugin,
    mpxTemplateHtmlPlugin,
    mpxTemplateInlineCssPlugin,
    mpxTemplateInlineTsPlugin,
    mpxSfcStylesPlugin,
    mpxSfcCustomBlocksPlugin,
    mpxSfcScriptsFormatPlugin,
    mpxSfcTemplatePlugin,
    mpxTsxPlugin,
    ...pluginContext.mpxCompilerOptions.plugins,
  ]

  const pluginInstances = plugins
    .flatMap(plugin => {
      try {
        const instance = plugin(pluginContext)
        const moduleName = (plugin as any).__moduleName
        if (Array.isArray(instance)) {
          for (let i = 0; i < instance.length; i++) {
            instance[i].name ??= `${moduleName} (${i})`
          }
        } else {
          instance.name ??= moduleName
        }
        return instance
      } catch (err) {
        console.warn('[Mpx] Failed to create plugin', err)
      }
    })
    .filter(plugin => !!plugin)
    .sort((a, b) => {
      const aOrder = a.order ?? 0
      const bOrder = b.order ?? 0
      return aOrder - bOrder
    })

  return pluginInstances.filter(plugin => {
    if (!validVersions.includes(plugin.version)) {
      console.warn(
        `[Mpx] Plugin ${plugin.name} is not compatible with the current Mpx language tools version. (version: ${plugin.version}, supported versions: ${JSON.stringify(validVersions)})`,
      )
      return false
    }
    return true
  })
}
