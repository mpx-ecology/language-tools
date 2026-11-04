import type { LanguageServer } from '@volar/language-server'
import type { CancellationToken } from '@volar/language-server/protocol'
import { componentNavigationRanges } from '@mpxjs/language-service'
import { URI } from 'vscode-uri'
import type {
  ComponentNavigationRangesParams,
  ComponentNavigationRangesResult,
} from './protocol'

/** Resolve through the document's project, including unsaved source versions. */
export async function getComponentNavigationRangeResponse(
  server: LanguageServer,
  params: ComponentNavigationRangesParams,
  token: CancellationToken,
): Promise<ComponentNavigationRangesResult> {
  const uri = URI.parse(params.textDocument.uri)
  const version = () => server.documents.get(uri)?.version ?? -1
  if (
    token.isCancellationRequested ||
    version() !== params.textDocument.version
  )
    return { version: version(), ranges: [] }
  const service = await server.project.getLanguageService(uri)
  if (
    token.isCancellationRequested ||
    version() !== params.textDocument.version
  )
    return { version: version(), ranges: [] }
  return {
    version: version(),
    ranges: service ? componentNavigationRanges(service.context, uri) : [],
  }
}
