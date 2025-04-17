import { cacheStringFunction } from './memoize'

const camelizeRE = /-(\w)/g

export const camelize: (str: string) => string = cacheStringFunction(
  (str: string): string => {
    return str.replace(camelizeRE, (_, c) => (c ? c.toUpperCase() : ''))
  },
)

export const capitalize: <T extends string>(str: T) => Capitalize<T> =
  cacheStringFunction(<T extends string>(str: T) => {
    return (str.charAt(0).toUpperCase() + str.slice(1)) as Capitalize<T>
  })
