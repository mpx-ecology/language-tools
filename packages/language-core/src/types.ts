import type { CodeInformation } from '@volar/language-core'
import type * as CompilerDOM from '@vue/compiler-dom'
import type { SFCJsonBlock, SFCParseResult } from '@vue/compiler-sfc'
import type { Segment } from 'muggle-string'
import type * as ts from 'typescript'
import type { MpxEmbeddedCode } from './virtualFile/embeddedFile'

export type { SFCParseResult } from '@vue/compiler-sfc'
export type RawMpxCompilerOptions = Partial<
  Omit<MpxCompilerOptions, 'plugins'>
> & {
  strictTemplates?: boolean
  plugins?: string[]
}
export { MpxEmbeddedCode }

export interface MpxCodeInformation extends CodeInformation {
  __combineOffset?: number
  __linkedToken?: symbol
}

export type Code = Segment<MpxCodeInformation>

export interface MpxCompilerOptions {
  lib: string
  extensions: string[]
  petiteMpxExtensions: string[]
  strictSlotChildren: boolean
  strictWxModel: boolean
  checkUnknownProps: boolean
  checkUnknownEvents: boolean
  checkUnknownDirectives: boolean
  checkUnknownComponents: boolean
  inferComponentDollarEl: boolean
  inferComponentDollarRefs: boolean
  inferTemplateDollarRefs: boolean
  inferTemplateDollarSlots: boolean
  skipTemplateCheck: boolean
  fallthroughAttributes: boolean
  fallthroughComponentNames: string[]
  dataAttributes: string[]
  htmlAttributes: string[]
  optionsWrapper: [string, string] | []
  optionsComponentCtor: string[]
  optionsPageCtor: string[]
  macros: {
    defineProps: string[]
    defineSlots: string[]
    defineExpose: string[]
    defineModel: string[]
    defineOptions: string[]
    withDefaults: string[]
  }
  composables: {
    useTemplateRef: string[]
  }
  plugins: MpxLanguagePlugin[]

  // experimental
  experimentalDefinePropProposal: false
  experimentalResolveStyleCssClasses: 'scoped' | 'always' | 'never'
  experimentalModelPropName: Record<
    string,
    Record<string, boolean | Record<string, string> | Record<string, string>[]>
  >

  // internal
  __setupedGlobalTypes?:
    | true
    | {
        absolutePath: string
      }
}

export type MpxLanguagePluginReturn = {
  name?: string
  order?: number
  requiredCompilerOptions?: string[]
  getLanguageId?(fileName: string): string | undefined
  isValidFile?(fileName: string, languageId: string): boolean
  parseSFC?(
    fileName: string,
    languageId: string,
    content: string,
  ): SFCParseResult | undefined
  updateSFC?(
    oldResult: SFCParseResult,
    textChange: { start: number; end: number; newText: string },
  ): SFCParseResult | undefined
  resolveTemplateCompilerOptions?(
    options: CompilerDOM.CompilerOptions,
  ): CompilerDOM.CompilerOptions
  compileSFCScript?(lang: string, script: string): ts.SourceFile | undefined
  compileSFCTemplate?(
    lang: string,
    template: string,
    options: CompilerDOM.CompilerOptions,
  ): CompilerDOM.CodegenResult | undefined
  updateSFCTemplate?(
    oldResult: CompilerDOM.CodegenResult,
    textChange: { start: number; end: number; newText: string },
  ): CompilerDOM.CodegenResult | undefined
  getEmbeddedCodes?(fileName: string, sfc: Sfc): { id: string; lang: string }[]
  resolveEmbeddedCode?(
    fileName: string,
    sfc: Sfc,
    embeddedFile: MpxEmbeddedCode,
  ): void
}

export type MpxLanguagePlugin = (ctx: {
  modules: {
    typescript: typeof ts
    '@vue/compiler-dom': typeof CompilerDOM
  }
  compilerOptions: ts.CompilerOptions
  mpxCompilerOptions: MpxCompilerOptions
}) => MpxLanguagePluginReturn | MpxLanguagePluginReturn[]

export interface SfcBlock {
  name: string
  start: number
  end: number
  startTagEnd: number
  endTagStart: number
  lang: string
  content: string
  attrs: Record<string, string | true>
}

export type SfcBlockAttr =
  | true
  | {
      text: string
      offset: number
      quotes: boolean
    }

export interface Sfc {
  content: string
  comments: string[]
  template:
    | (SfcBlock & {
        ast: CompilerDOM.RootNode | undefined
        errors: CompilerDOM.CompilerError[]
        warnings: CompilerDOM.CompilerError[]
      })
    | undefined
  script:
    | (SfcBlock & {
        src: SfcBlockAttr | undefined
        ast: ts.SourceFile
      })
    | undefined
  scriptSetup:
    | (SfcBlock & {
        ast: ts.SourceFile
      })
    | undefined
  styles: readonly (SfcBlock & {
    scoped: boolean
    module?: SfcBlockAttr | undefined
    cssVars: {
      text: string
      offset: number
    }[]
    classNames: {
      text: string
      offset: number
    }[]
  })[]
  json:
    | (SfcBlock & Pick<SFCJsonBlock, 'jsonType' | 'usingComponents'>)
    | undefined
  customBlocks: readonly (SfcBlock & {
    type: string
  })[]
}

declare module '@vue/compiler-sfc' {
  interface SFCBlock {
    __src?: SfcBlockAttr
  }

  interface SFCScriptBlock {}

  interface SFCStyleBlock {
    __module?: SfcBlockAttr
  }

  interface SFCJsonBlock extends SFCBlock {
    type: 'json'
    jsonType: 'application/json' | 'application/script'
    usingComponents?: Promise<
      Map<
        string,
        { configPath: string; absolutePath: string; relativePath: string }[]
      >
    >
  }

  interface SFCDescriptor {
    json?: SFCJsonBlock
  }
}

export interface TextRange {
  start: number
  end: number
}

declare module '@vue/compiler-dom' {
  export interface ForParseResult {
    mpx?: boolean
    defaultValue?: boolean
    defaultIndex?: boolean
  }
}
