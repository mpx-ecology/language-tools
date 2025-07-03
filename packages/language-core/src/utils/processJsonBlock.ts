import { SFCDescriptor, SFCJsonBlock, SFCScriptBlock } from '@vue/compiler-sfc'
import type * as ts from 'typescript'

export interface ProcessJsonBlockOptions {
  uri?: string
  compilerConfig?: ts.CompilerOptions
}

export function processJsonBlock(
  scriptBlock: SFCScriptBlock,
  descriptor: SFCDescriptor,
  _options: ProcessJsonBlockOptions = {},
) {
  const jsonBlock = scriptBlock as unknown as SFCJsonBlock
  const usingComponents: Record<string, string | string[]> = {}
  let isMatched = false

  // static json
  if (scriptBlock.attrs.type === 'application/json') {
    jsonBlock.jsonType = 'application/json'

    try {
      const mpxConfigDeclaretion = JSON.parse(jsonBlock.content)
      Object.assign(
        usingComponents,
        mpxConfigDeclaretion?.usingComponents ?? {},
      )
    } catch (error) {
      console.log('[Mpx] JSON parse jsonBlock.content error:', error)
    }

    isMatched = true
  } else if (scriptBlock.attrs.name === 'json') {
    // dynamic json
    jsonBlock.jsonType = 'application/script'
    // extractUsingComponents(jsonBlock.content, usingComponents)
    isMatched = true
  }

  descriptor.json = jsonBlock

  return isMatched
}
