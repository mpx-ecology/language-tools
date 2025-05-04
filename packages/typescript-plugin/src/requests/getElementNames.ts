import { MpxVirtualCode } from '@mpxjs/language-core'
import type * as ts from 'typescript'
import type { RequestContext } from './types'
import { getVariableType } from './utils'

export function getElementNames(this: RequestContext, fileName: string) {
  const { typescript: ts, language, languageService, getFileId } = this
  const volarFile = language.scripts.get(getFileId(fileName))
  if (!(volarFile?.generated?.root instanceof MpxVirtualCode)) {
    return
  }
  const mpxCode = volarFile.generated.root
  return _getElementNames(ts, languageService, mpxCode)
}

export function _getElementNames(
  ts: typeof import('typescript'),
  tsLs: ts.LanguageService,
  mpxCode: MpxVirtualCode,
) {
  return (
    getVariableType(ts, tsLs, mpxCode, '__VLS_elements')
      ?.type?.getProperties()
      .map(c => c.name) ?? []
  )
}
