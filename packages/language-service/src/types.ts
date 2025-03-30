export enum AttrNameCasing {
  Kebab,
  Camel,
}

export enum TagNameCasing {
  Kebab,
  Pascal,
}

export const commands = {
  parseSfc: 'vue.parseSfc',
  detectNameCasing: 'vue.detectNameCasing',
  convertTagsToKebabCase: 'vue.convertTagsToKebabCase',
  convertTagsToPascalCase: 'vue.convertTagsToPascalCase',
  convertPropsToKebabCase: 'vue.convertPropsToKebabCase',
  convertPropsToCamelCase: 'vue.convertPropsToCamelCase',
}

// only export types of depend packages
export * from '@volar/language-service/lib/types'
export * from '@mpxjs/language-core/out/types'
