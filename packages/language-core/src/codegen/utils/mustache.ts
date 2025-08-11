export const mustacheRE = /\{\{((?:.|\n|\r)+?)\}\}(?!})/
export const mustacheREG = /\{\{((?:.|\n|\r)+?)\}\}(?!})/g

export const extractMustacheWithSpacingRE = /^\{\{(\s*)(.*?)(\s*)\}\}$/
export const extractSpacingRE = /^(\s*)(.*?)(\s*)$/

export function replaceMustacheWithSpaces(str: string): string {
  return str.replace(mustacheREG, match => ' '.repeat(match.length))
}

export function extractMustacheContentAndPosition(str: string): {
  content: string
  start: number
} | null {
  const match = extractMustacheWithSpacingRE.exec(str)
  if (!match) return null
  const [, leadingSpaces, content] = match
  return {
    content,
    start: 2 + leadingSpaces.length,
  }
}

export function extractSpacingContentAndPosition(str: string): {
  content: string
  start: number
} | null {
  const match = extractSpacingRE.exec(str)
  if (!match) return null
  const [, leadingSpaces, content] = match
  return {
    content,
    start: leadingSpaces.length,
  }
}
