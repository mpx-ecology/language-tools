import fs from 'node:fs'
import path from 'node:path'
import * as ts from 'typescript'
import * as CompilerDOM from '@vue/compiler-dom'
import { describe, expect, it } from 'vitest'
import { toString } from 'muggle-string'
import { buildMappings } from '../src/utils/buildMappings'
import { appendCode } from '../src/codegen/utils'
import { MpxVirtualCode, getDefaultCompilerOptions } from '../src'
import { createPlugins } from '../src/plugins'
import { generateTemplate } from '../src/codegen/template'
import type { TemplateCodegenOptions } from '../src/codegen/template'
import type { Code } from '../src/types'

const fixtures = [
  'mpx-tag-name/index.mpx',
  'mpx-tag-name/overlap.mpx',
  'mpx-tag-name/shared.mpx',
  'mpx-tag-name/shared-errors.mpx',
  'mpx-tag-name/shared-custom.mpx',
  'mpx-tag-name/events.mpx',
  'mpx-tag-name/platforms.mpx',
  'mpx-tag-name/suppressed.mpx',
  'mpx-tag-name/wrappers.mpx',
  'template-completion/scoped.mpx',
  'template-completion/scoped-editing.mpx',
  'platform-components/index.mpx',
]

function generate(file: string, buffered: boolean) {
  const fileName = path.resolve(__dirname, 'fixtures', file)
  const mpxCompilerOptions = getDefaultCompilerOptions()
  const plugins = createPlugins({
    modules: { typescript: ts, '@vue/compiler-dom': CompilerDOM },
    compilerOptions: {},
    mpxCompilerOptions,
  })
  const root = new MpxVirtualCode(
    fileName,
    'mpx',
    ts.ScriptSnapshot.fromString(fs.readFileSync(fileName, 'utf8')),
    mpxCompilerOptions,
    plugins,
    ts,
  )
  const options: TemplateCodegenOptions = {
    ts,
    compilerOptions: {},
    mpxCompilerOptions,
    template: root.sfc.template!,
    usingComponents: root.sfc.usingComponents,
    scriptSetupBindingNames: new Set(),
    scriptSetupImportComponentNames: new Set(),
    destructuredPropNames: new Set(),
    templateRefNames: new Set(),
  }
  const codes: Code[] = []
  const iterator = generateTemplate(options, buffered ? codes : undefined)
  let result = iterator.next()
  while (!result.done) {
    if (buffered) appendCode(codes, result.value)
    else codes.push(result.value)
    result = iterator.next()
  }
  const ctx = result.value
  return {
    text: toString(codes),
    mappings: JSON.parse(
      JSON.stringify(buildMappings(codes), (_, value) =>
        typeof value === 'function' ? value.toString() : value,
      ),
    ),
    tags: ctx.templateNodeTags,
    externalVariables: [...ctx.accessExternalVariables].map(
      ([name, offsets]) => [name, [...offsets]],
    ),
    remainingLocals: ctx.getLocalVariables(),
    blockConditions: ctx.blockConditions,
    currentComponent: ctx.currentComponent,
  }
}

describe('buffered template code generation', () => {
  it.each(fixtures)(
    'preserves every segment, mapping feature and scope for %s',
    file => {
      expect(generate(file, true)).toEqual(generate(file, false))
    },
  )
})
