import VueCompiler from '@vue/compiler-core'
import '@vue/compiler-sfc'

declare module '@vue/compiler-dom' {
  // export default VueCompiler

  export interface ForNode {
    // parseResult: {
    //   mpx?: boolean
    // } & VueCompiler['ForNode']['parseResult']
  }

  export interface ForParseResult {
    mpx?: boolean
    defaultValue?: boolean
    defaultIndex?: boolean
  }
}

declare module '@vue/compiler-sfc' {
  export interface SFCJsonBlock extends SFCBlock {
    type: 'json'
    jsonType: 'application/json' | 'application/script'
    usingComponents?: Promise<
      Map<
        string,
        { configPath: string; absolutePath: string; relativePath: string }[]
      >
    >
  }

  export interface SFCDescriptor {
    json?: SFCJsonBlock
  }
}
