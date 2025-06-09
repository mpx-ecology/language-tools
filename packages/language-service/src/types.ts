import { MpxCompilerOptions } from '@mpxjs/language-core'

export enum Commands {
  ParseSfc = 'mpx.parseSfc',
}

// only export types of depend packages
export * from '@volar/language-service/lib/types'
export * from '@mpxjs/language-core/out/types'

declare module '@volar/language-service' {
  export interface ProjectContext {
    mpx?: {
      compilerOptions: MpxCompilerOptions
    }
  }
}
