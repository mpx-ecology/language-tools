import { URI } from 'vscode-uri'

export const uriToFileName = (uri: string) =>
  URI.parse(uri).fsPath.replace(/\\/g, '/')

export function withResolvers<T>() {
  let resolve!: (value: T | PromiseLike<T>) => void,
    reject!: (reason?: any) => void

  const promise = new Promise<T>((res, rej) => {
    resolve = res
    reject = rej
  })

  return {
    promise,
    resolve,
    reject,
  }
}

export async function findResult<T, R>(
  arr: T[],
  callback: (item: T) => Promise<R>,
): Promise<R | undefined> {
  for (const item of arr) {
    const result = await callback(item)
    if (result) return result
  }
}
