import fs from 'node:fs'
import { createRequire } from 'node:module'
import path from 'node:path'
import vm from 'node:vm'
import * as ts from 'typescript'

// Use the published compiler's actual SFC, script-setup and template passes.
// Do not depend on a sibling checkout or the mutable inspect-extension workspace.
const requireFromTest = createRequire(__filename)
const requireCompiler = createRequire(
  process.env.MPX_TEST_COMPILER_PACKAGE
    ? path.resolve(process.env.MPX_TEST_COMPILER_PACKAGE)
    : requireFromTest.resolve('@mpxjs/webpack-plugin/package.json'),
)
interface Block {
  content: string
  lang?: string
  setup?: boolean
}
interface ParsedSfc {
  script: Block | null
  template: Block | null
}
const parseSfc: (source: string, options: object) => ParsedSfc =
  requireCompiler('./lib/parser')
const scriptCompiler: (this: object, source: string) => Promise<void> =
  requireCompiler('./lib/script-setup-compiler')
const templateCompiler: {
  parse(source: string, options: object): { root: unknown }
  serialize(root: unknown): string
  parseMustache(
    source: string,
    onExpression: (expression: string) => string,
  ): unknown
} = requireCompiler('./lib/template-compiler/compiler')
const { parseExp }: { parseExp(expression: string): unknown } = requireCompiler(
  './lib/template-compiler/parse-exps',
)

interface ComponentOptions {
  properties?: Record<string, { type: { name: string }; value: unknown }>
  setup(props: Record<string, unknown>, context: object): unknown
}

export async function compileMpxSource(
  source: string,
  fileName: string,
  mode = 'wx',
) {
  const parts = parseSfc(source, { filePath: fileName, mode, env: '' })
  if (!parts.script?.setup)
    throw new Error('Expected an active Mpx script setup block')
  let code: string | undefined
  await scriptCompiler.call(
    {
      resource: `${fileName}?ctorType=component&lang=${parts.script.lang ?? 'js'}`,
      resourcePath: fileName,
      async: () => (error: Error | null, output: string) => {
        if (error) throw error
        code = output
      },
    },
    parts.script.content,
  )
  if (code === undefined)
    throw new Error('Mpx compiler did not produce a script')

  let wxml = ''
  if (parts.template) {
    const fail = (message: string) => {
      throw new Error(message)
    }
    const template = templateCompiler.parse(parts.template.content, {
      filePath: fileName,
      mode,
      srcMode: 'wx',
      usingComponents: [],
      usingComponentsInfo: {},
      externalClasses: [],
      proxyComponentEventsRules: [],
      defs: { __mpx_mode__: mode, __mpx_src_mode__: 'wx', __mpx_env__: '' },
      warn: fail,
      error: fail,
    })
    wxml = templateCompiler.serialize(template.root)
    // These fixtures use native data expressions, without WXS or i18n calls.
    // Check the emitted bindings with Mpx's native-expression grammar as well.
    templateCompiler.parseMustache(wxml, expression => {
      parseExp(expression)
      return expression
    })
  }
  return { code, wxml, script: parts.script }
}

export function runCompiledMpx(code: string, fileName: string) {
  let component: ComponentOptions | undefined
  let registrations = 0
  const modules = new Map<string, { exports: object }>()
  const core = {
    createComponent(options: ComponentOptions) {
      component = options
      registrations++
    },
  }
  function evaluate(source: string, moduleFile: string) {
    const output = ts.transpileModule(source, {
      fileName: moduleFile.endsWith('.mpx') ? `${moduleFile}.ts` : moduleFile,
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
      },
      reportDiagnostics: true,
    })
    if (output.diagnostics?.length) {
      throw new Error(
        output.diagnostics
          .map(d => ts.flattenDiagnosticMessageText(d.messageText, '\n'))
          .join('\n'),
      )
    }
    const module = { exports: {} }
    modules.set(moduleFile, module)
    const load = (name: string): object => {
      if (name === '@mpxjs/core') return core
      if (!name.startsWith('.'))
        throw new Error(`Unexpected fixture dependency: ${name}`)
      const resolved = ts.resolveModuleName(
        name,
        moduleFile,
        {
          moduleResolution: ts.ModuleResolutionKind.Node10,
        },
        ts.sys,
      ).resolvedModule?.resolvedFileName
      if (!resolved)
        throw new Error(`Cannot resolve fixture dependency: ${name}`)
      return (
        modules.get(resolved)?.exports ??
        evaluate(fs.readFileSync(resolved, 'utf8'), resolved)
      )
    }
    new vm.Script(output.outputText, { filename: moduleFile }).runInNewContext(
      { require: load, module, exports: module.exports },
      { timeout: 1000 },
    )
    return module.exports
  }
  evaluate(code, fileName)
  if (!component || registrations !== 1)
    throw new Error('Expected exactly one Mpx component registration')
  const defaults = Object.fromEntries(
    Object.entries(component.properties ?? {}).map(([name, property]) => [
      name,
      property.value,
    ]),
  )
  const exposed: unknown = new vm.Script(
    'component.setup(props, {})',
  ).runInNewContext({ component, props: defaults }, { timeout: 1000 })
  return {
    properties: component.properties ?? {},
    defaults: JSON.parse(JSON.stringify(defaults)) as Record<string, unknown>,
    exposed: JSON.parse(JSON.stringify(exposed)) as unknown,
  }
}

export async function compileMpxFixture(fileName: string) {
  return compileMpxSource(
    fs.readFileSync(fileName, 'utf8'),
    path.resolve(fileName),
  )
}
