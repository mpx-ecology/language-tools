import { collectExtractProps } from './collectExtractProps'
import { getComponentNames } from './getComponentNames'
import { getImportPathForFile } from './getImportPathForFile'
import { getPropertiesAtLocation } from './getPropertiesAtLocation'
import { getComponentProps } from './getComponentProps'
import { getComponentEvents } from './getComponentEvents'
import { getComponentDirectives } from './getComponentDirectives'
import { getElementAttrs } from './getElementAttrs'
import { getElementNames } from './getElementNames'

type ToRequest<T extends (...args: any) => any> = (
  ...args: Parameters<T>
) => Promise<ReturnType<T> | null | undefined>

export interface IRequests {
  collectExtractProps: ToRequest<typeof collectExtractProps>
  getImportPathForFile: ToRequest<typeof getImportPathForFile>
  getPropertiesAtLocation: ToRequest<typeof getPropertiesAtLocation>
  getComponentNames: ToRequest<typeof getComponentNames>
  getComponentProps: ToRequest<typeof getComponentProps>
  getComponentEvents: ToRequest<typeof getComponentEvents>
  getComponentDirectives: ToRequest<typeof getComponentDirectives>
  getElementAttrs: ToRequest<typeof getElementAttrs>
  getElementNames: ToRequest<typeof getElementNames>
  getQuickInfoAtPosition: ToRequest<
    (fileName: string, position: { line: number; character: number }) => string
  >
}

export {
  collectExtractProps,
  getComponentNames,
  getImportPathForFile,
  getPropertiesAtLocation,
  getComponentProps,
  getComponentEvents,
  getComponentDirectives,
  getElementAttrs,
  getElementNames,
}
