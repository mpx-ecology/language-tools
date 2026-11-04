import type { LanguageServicePlugin } from '@volar/language-service'
import { resolveMpxDiagnosticCode } from '@mpxjs/language-shared'

/** Keep known legacy Mpx providers compatible as their feature PRs land. */
export function withNumericMpxDiagnosticCodes(
  plugin: LanguageServicePlugin,
): LanguageServicePlugin {
  if (!plugin.name?.startsWith('mpx-')) return plugin
  return {
    ...plugin,
    create(context) {
      const instance = plugin.create(context)
      const provideDiagnostics = instance.provideDiagnostics
      if (!provideDiagnostics) return instance
      return {
        ...instance,
        async provideDiagnostics(...args) {
          const diagnostics = await provideDiagnostics.apply(instance, args)
          return diagnostics?.map(diagnostic => {
            const code = resolveMpxDiagnosticCode(
              diagnostic.source,
              diagnostic.code,
            )
            return code === diagnostic.code
              ? diagnostic
              : { ...diagnostic, code }
          })
        },
      }
    },
  }
}
