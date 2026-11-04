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
  return _getComponentNames(ts, languageService, mpxCode)
}

export function _getComponentNames(
  ts: typeof import('typescript'),
  tsLs: ts.LanguageService,
  mpxCode: MpxVirtualCode,
) {
  const names = new Set<string>()
  for (const map of ['__MPX_jsonComponents', '__MPX_scriptComponents']) {
    for (const property of getVariableType(
      ts,
      tsLs,
      mpxCode,
      map,
    )?.type.getProperties() ?? []) {
      names.add(property.name)
    }
  }
  // Instance methods/data are template values, not registered tag candidates.
  const contextNames = new Set(
    getVariableType(ts, tsLs, mpxCode, '__MPX_ctx')
      ?.type.getProperties()
      .map(property => property.name),
  )
  for (const property of getVariableType(
    ts,
    tsLs,
    mpxCode,
    '__VLS_components',
  )?.type.getProperties() ?? []) {
    if (!contextNames.has(property.name)) names.add(property.name)
  }
  names.add(getSelfComponentName(mpxCode.fileName))
  return [...names].filter(
    entry => !entry.includes('$') && !entry.startsWith('_'),
  )
}
