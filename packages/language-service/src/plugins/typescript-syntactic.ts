import type { LanguageServicePlugin } from '@volar/language-service'
import { create as baseCreate } from 'volar-service-typescript/lib/plugins/syntactic'
import { prettierEnabled } from '../utils/formatter'

export function create(ts: typeof import('typescript')): LanguageServicePlugin {
  const base = baseCreate(ts, {
    isFormattingEnabled: async (document, context) => {
      if (await prettierEnabled(document, context)) {
        // 开启 script.prettier 后关闭 ts 默认格式化
        return false
      }
      return true
    },
  })

  return base
}
