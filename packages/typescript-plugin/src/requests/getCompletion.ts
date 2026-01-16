import type { RequestContext } from './types'

export function getCompletionAtPostion(
  this: RequestContext,
  fileName: string,
  position: number,
) {
  const { languageService } = this
  const completion = languageService.getCompletionsAtPosition(
    fileName,
    position,
    {},
  )

  return completion?.entries
}
