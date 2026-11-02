import fs from 'node:fs'
import { createRequire } from 'node:module'

const requireFromTest = createRequire(__filename)
const requireCompiler = createRequire(
  requireFromTest.resolve('@mpxjs/webpack-plugin/package.json'),
)
const parse = requireCompiler('./lib/parser')
const evaluate = requireCompiler('./lib/utils/eval-json-js')

export function evaluateMpxJson(source: string, fileName: string) {
  const { json } = parse(source, { filePath: fileName, mode: 'wx', env: '' })
  if (!json?.useJSONJS) throw new Error('Expected a real Mpx JSON JS block')
  return evaluate(json.content, fileName, {
    _compiler: { inputFileSystem: fs },
    getMpx: () => ({ defs: { __json_build_flag__: true } }),
    addDependency() {},
  })
}
