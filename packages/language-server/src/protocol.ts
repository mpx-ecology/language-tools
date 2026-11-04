import { RequestType } from '@volar/language-server/protocol'
import type {
  Range,
  VersionedTextDocumentIdentifier,
} from '@volar/language-server/protocol'
export * from '@volar/language-server/protocol'

export interface ComponentNavigationRangesParams {
  textDocument: VersionedTextDocumentIdentifier
}
export interface ComponentNavigationRangesResult {
  version: number
  ranges: Range[]
}
export const ComponentNavigationRangesRequest = new RequestType<
  ComponentNavigationRangesParams,
  ComponentNavigationRangesResult,
  never
>('mpx/componentNavigationRanges')
