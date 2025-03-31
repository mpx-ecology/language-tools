export enum AttrNameCasing {
  Kebab,
  Camel,
}

export enum TagNameCasing {
  Kebab,
  Pascal,
}

export const commands = {
  parseSfc: 'mpx.parseSfc',
  detectNameCasing: 'mpx.detectNameCasing',
  convertTagsToKebabCase: 'mpx.convertTagsToKebabCase',
  convertTagsToPascalCase: 'mpx.convertTagsToPascalCase',
  convertPropsToKebabCase: 'mpx.convertPropsToKebabCase',
  convertPropsToCamelCase: 'mpx.convertPropsToCamelCase',
}

// only export types of depend packages
export * from '@volar/language-service/lib/types'
export * from '@mpxjs/language-core/out/types'
