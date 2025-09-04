import type { LanguageServicePlugin } from '@volar/language-service'
import { create as baseCreate } from 'volar-service-json'
import mpxJsonSchema from '../data/mpxJsonSchema'

export function create(): LanguageServicePlugin {
  const base = baseCreate({
    getDocumentLanguageSettings: () => {
      // mpx script-json json 语法模块允许注释和尾随逗号
      return { comments: 'ignore', trailingCommas: 'ignore' }
    },
    getFormattingOptions: async (_document, options, context) => {
      return {
        ...options,
        ...(await context.env.getConfiguration?.('json.format')),
        // 最后一行换行避免和 </script> 标签同一行
        insertFinalNewline: true,
      }
    },
    getLanguageSettings: () => {
      return {
        validate: true,
        schemas: [
          {
            uri: 'mpx-json.schema.json',
            fileMatch: ['*.mpx'],
            schema: mpxJsonSchema,
          },
        ],
      }
    },
  })

  return {
    ...base,
    name: 'mpx-json-json',
  }
}
