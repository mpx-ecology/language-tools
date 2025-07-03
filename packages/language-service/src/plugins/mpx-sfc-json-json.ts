import type { LanguageServicePlugin } from '@volar/language-service'
import { create as baseCreate } from 'volar-service-json'

export function create(): LanguageServicePlugin {
  const base = baseCreate({
    getDocumentLanguageSettings: () => {
      // mpx script-json json 语法模块允许注释和尾随逗号
      return { comments: 'ignore', trailingCommas: 'ignore' }
    },
  })

  return base
}
