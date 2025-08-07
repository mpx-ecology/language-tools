export const mustacheRE = /\{\{((?:.|\n|\r)+?)\}\}(?!})/
export const mustacheREG = /\{\{((?:.|\n|\r)+?)\}\}(?!})/g

export function replaceMustacheWithSpaces(str: string): string {
  return str.replace(mustacheREG, match => ' '.repeat(match.length))
}
