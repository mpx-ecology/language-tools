import { MpxCompilerOptions } from '@mpxjs/language-core'

export enum AttrNameCasing {
  Kebab,
  Camel,
}

export enum TagNameCasing {
  Kebab,
  Pascal,
}

export enum Commands {
  ParseSfc = 'mpx.parseSfc',
  DetectNameCasing = 'mpx.detectNameCasing',
  ConvertTagsToKebabCase = 'mpx.convertTagsToKebabCase',
  ConvertTagsToPascalCase = 'mpx.convertTagsToPascalCase',
  ConvertPropsToKebabCase = 'mpx.convertPropsToKebabCase',
  ConvertPropsToCamelCase = 'mpx.convertPropsToCamelCase',
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
