import type { RequestContext } from './types'
import { MpxVirtualCode } from '@mpxjs/language-core'
import { getComponentType, getVariableType } from './utils'

export function getComponentEvents(
  this: RequestContext,
  fileName: string,
  tag: string,
) {
  const { typescript: ts, language, languageService, getFileId } = this
  const volarFile = language.scripts.get(getFileId(fileName))
  if (!(volarFile?.generated?.root instanceof MpxVirtualCode)) {
    return
  }
  const mpxCode = volarFile.generated.root
  const program = languageService.getProgram()!
  const checker = program.getTypeChecker()
  const components = getVariableType(
    ts,
    languageService,
    mpxCode,
    '__VLS_components',
  )
  if (!components) {
    return []
  }

  const componentType = getComponentType(
    ts,
    languageService,
    mpxCode,
    components,
    fileName,
    tag,
  )
  if (!componentType) {
    return []
  }

  const result = new Set<string>()

  for (const sig of componentType.getConstructSignatures()) {
    const instanceType = sig.getReturnType()
    const emitSymbol = instanceType.getProperty('$emit')
    if (emitSymbol) {
      const emitType = checker.getTypeOfSymbolAtLocation(
        emitSymbol,
        components.node,
      )
      for (const call of emitType.getCallSignatures()) {
        const eventNameParamSymbol = call.parameters[0]
        if (eventNameParamSymbol) {
          const eventNameParamType = checker.getTypeOfSymbolAtLocation(
            eventNameParamSymbol,
            components.node,
          )
          if (eventNameParamType.isStringLiteral()) {
            result.add(eventNameParamType.value)
          }
        }
      }
    }
  }

  return [...result]
}
