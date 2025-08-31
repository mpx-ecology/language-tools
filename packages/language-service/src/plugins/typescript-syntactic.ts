import type { LanguageServicePlugin } from '@volar/language-service'
import { create as baseCreate } from 'volar-service-typescript/lib/plugins/syntactic'

export function create(ts: typeof import('typescript')): LanguageServicePlugin {
  const base = baseCreate(ts, {
    isFormattingEnabled: async (_, context) => {
      const enablePrettier =
        (await context.env.getConfiguration?.('mpx.format.script.prettier')) ??
        false
      if (enablePrettier) {
        // 开启 script.prettier 后关闭 ts 默认格式化
        return false
      }
      return true
    },
  })

  return base
}
