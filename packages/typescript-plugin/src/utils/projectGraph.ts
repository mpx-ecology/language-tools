import type * as ts from 'typescript'

/** Reuse immutable filesystem reads only within one synchronous graph update. */
export function createProjectGraphScope(
  host: Partial<Pick<ts.LanguageServiceHost, 'realpath' | 'readFile'>>,
) {
  let active = false
  const clears: (() => void)[] = []
  function cache<T>(resolve: (fileName: string) => T) {
    const values = new Map<string, T>()
    clears.push(() => values.clear())
    return (fileName: string): T => {
      if (!active) return resolve(fileName)
      if (values.has(fileName)) return values.get(fileName)!
      const value = resolve(fileName)
      values.set(fileName, value)
      return value
    }
  }
  if (host.realpath) host.realpath = cache(host.realpath.bind(host))
  if (host.readFile) host.readFile = cache(host.readFile.bind(host))
  return <T>(run: () => T): T => {
    if (active) return run()
    active = true
    try {
      return run()
    } finally {
      active = false
      for (const clear of clears) clear()
    }
  }
}
