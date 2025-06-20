/// <reference types="@volar/typescript" />

import type * as ts from 'typescript'
import type { Language } from '@mpxjs/language-core'

export interface RequestContext<T = any> {
  typescript: typeof ts
  languageService: ts.LanguageService
  languageServiceHost: ts.LanguageServiceHost
  language: Language<T>
  isTsPlugin: boolean
  getFileId: (fileName: string) => T
}
