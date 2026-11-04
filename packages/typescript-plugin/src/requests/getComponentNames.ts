import type * as ts from 'typescript'
import type { RequestContext } from './types'
import { MpxVirtualCode } from '@mpxjs/language-core'
import { getSelfComponentName, getVariableType } from './utils'

export function getComponentNames(this: RequestContext, fileName: string) {
  const { typescript: ts, language, languageService, getFileId } = this
  const volarFile = language.scripts.get(getFileId(fileName))
  if (!(volarFile?.generated?.root instanceof MpxVirtualCode)) {
    return
  }
  const mpxCode = volarFile.generated.root
  return _getComponentNames(ts, languageService, mpxCode, true)
}

export function _getComponentNames(
  ts: typeof import('typescript'),
  tsLs: ts.LanguageService,
  mpxCode: MpxVirtualCode,
  registeredOnly = false,
) {
  const names =
    getVariableType(
      ts,
      tsLs,
      mpxCode,
      registeredOnly ? '__VLS_registeredComponents' : '__VLS_components',
    )
      ?.type?.getProperties()
      .map(c => c.name)
      .filter(entry => !entry.includes('$') && !entry.startsWith('_')) ?? []

  if (!registeredOnly) names.push(getSelfComponentName(mpxCode.fileName))
  return names
}
