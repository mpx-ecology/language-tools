import * as ts from 'typescript'
import { expect, it, vi } from 'vitest'
import { createTsAst } from '../src/codegen/utils'
import { createTemplateCodegenContext } from '../src/codegen/template/context'
import { generateInterpolation } from '../src/codegen/template/interpolation'
import { getDefaultCompilerOptions } from '../src'
import { toString } from 'muggle-string'

it('shares short immutable syntax across holders and invalidates edited text', () => {
  const compiler = { ...ts, createSourceFile: vi.fn(ts.createSourceFile) }
  const first = {}
  const original = createTsAst(compiler, first, 'item.label')
  expect(createTsAst(compiler, {}, 'item.label')).toBe(original)
  expect(compiler.createSourceFile).toHaveBeenCalledTimes(1)
  expect(createTsAst(compiler, first, 'item.count').text).toBe('item.count')
  expect(original.text).toBe('item.label')
  expect(compiler.createSourceFile).toHaveBeenCalledTimes(2)
})

it('bounds shared syntax and keeps compiler instances and long expressions separate', () => {
  const compiler = { ...ts, createSourceFile: vi.fn(ts.createSourceFile) }
  const first = createTsAst(compiler, {}, 'first.label')
  for (let i = 0; i < 1100; i++) createTsAst(compiler, {}, `item${i}.label`)
  expect(createTsAst(compiler, {}, 'first.label')).not.toBe(first)
  const other = { ...ts }
  expect(createTsAst(other, {}, 'first.label')).not.toBe(first)
  const long = 'item.' + 'x'.repeat(300)
  const holder = {}
  const large = createTsAst(compiler, holder, long)
  expect(createTsAst(compiler, holder, long)).toBe(large)
  expect(createTsAst(compiler, {}, long)).not.toBe(large)
})

it('shares only syntax, retaining each interpolation scope and source offset', () => {
  const options = {
    ts,
    mpxCompilerOptions: getDefaultCompilerOptions(),
    destructuredPropNames: new Set<string>(),
    templateRefNames: new Set<string>(),
  }
  const original = '(row => row.label)(entry)'
  const contexts = [
    createTemplateCodegenContext({ scriptSetupBindingNames: new Set() }),
    createTemplateCodegenContext({ scriptSetupBindingNames: new Set() }),
  ]
  contexts[1].addLocalVariable('entry')
  const code = contexts.map((ctx, i) =>
    toString([
      ...generateInterpolation(
        options,
        ctx,
        'template',
        ctx.codeFeatures.all,
        original,
        20 + i * 100,
        {},
        '(',
        ')',
      ),
    ]),
  )
  expect(code[0]).toContain('__MPX_ctx.entry')
  expect(code[1]).not.toContain('__MPX_ctx.entry')
  expect(
    code.every(
      value => value.includes('row.label') && !value.includes('__MPX_ctx.row'),
    ),
  ).toBe(true)
  expect([...contexts[0].accessExternalVariables.keys()]).toEqual(['entry'])
  expect([...contexts[1].accessExternalVariables.keys()]).toEqual([])
  expect(contexts[0].getLocalVariables()).toEqual([])
  expect(contexts[1].getLocalVariables()).toEqual(['entry'])
})
