import fs from 'node:fs'
import path from 'node:path'
import { expect, it } from 'vitest'
import { parse } from '../src/utils/parseSfc'
import {
  compileMpxFixture,
  compileMpxSource,
  runCompiledMpx,
} from './utils/compileMpxFixture'
import { mpxCompilerCases } from './utils/mpxCompilerCases'

const fixtureRoot = path.resolve(__dirname, 'fixtures/vue-macro-coexistence')

it('requires a real compiler case for every positive Mpx fixture', () => {
  const files = fs
    .readdirSync(fixtureRoot)
    .filter(file => file.endsWith('.mpx') && !file.startsWith('invalid-'))
    .sort()
  expect(mpxCompilerCases.map(testCase => testCase.file).sort()).toEqual(files)
})

it.each(mpxCompilerCases)(
  'compiles and executes the real Mpx fixture $file',
  async testCase => {
    const fileName = path.join(fixtureRoot, testCase.file)
    const source = fs.readFileSync(fileName, 'utf8')
    const descriptor = parse(source).descriptor
    expect(descriptor.script).toBeNull()
    const compiled = await compileMpxFixture(fileName)
    expect(compiled.script.content.trim()).toBe(
      descriptor.scriptSetup?.content.trim(),
    )
    const result = runCompiledMpx(compiled.code, fileName)
    expect(result.defaults).toEqual(testCase.defaults)
    expect(result.exposed).toEqual(testCase.exposed)
    expect(Object.keys(result.properties).sort()).toEqual(
      Object.keys(testCase.defaults).sort(),
    )
    for (const [name, value] of Object.entries(testCase.defaults)) {
      const expectedType =
        typeof value === 'string'
          ? 'String'
          : typeof value === 'number'
            ? 'Number'
            : 'Object'
      expect(result.properties[name]?.type.name).toBe(expectedType)
    }
  },
)

it('rejects runtime props passed to withDefaults at the real compiler boundary', async () => {
  // Intentional compiler error: withDefaults requires type-based defineProps.
  const source = `<script setup>const props = withDefaults(defineProps({ title: String }), { title: 'hello' }); defineExpose({ props })</script>`
  await expect(
    compileMpxSource(
      source,
      path.join(fixtureRoot, 'invalid-runtime-defaults.mpx'),
    ),
  ).rejects.toThrow('withDefaults can only be used with type-based')
})

it('recognizes reserved macro names even when local functions use those names', async () => {
  // Intentional compiler error: local bindings do not turn reserved macro calls
  // into ordinary calls. Legal local-function cases use bound aliases instead.
  const source = `<script setup>if (true) { var defineProps = value => ({ value }); var withDefaults = value => value } const props = withDefaults(defineProps('local')); defineExpose({ props })</script>`
  await expect(
    compileMpxSource(
      source,
      path.join(fixtureRoot, 'invalid-reserved-call.mpx'),
    ),
  ).rejects.toThrow('withDefaults can only be used with type-based')
})

it('detects unbound aliases left in the actual compiled script', async () => {
  // Intentional runtime error: language-tool alias configuration supplies no
  // runtime function or compiler transform for this ordinary JS identifier.
  const source = `<script setup lang="ts">const props = mpxProps<{ title: string }>(); defineExpose({ props })</script>`
  const fileName = path.join(fixtureRoot, 'invalid-unbound-alias.mpx')
  const compiled = await compileMpxSource(source, fileName)
  expect(() => runCompiledMpx(compiled.code, fileName)).toThrow(
    'mpxProps is not defined',
  )
})

it('rejects method calls in native template bindings', async () => {
  // Intentional template error: a native binding cannot call a JS string method.
  const source = `<template><view>{{ title.toUpperCase() }}</view></template><script setup>const props = defineProps({ title: { type: String, value: 'hello' } }); defineExpose({ props })</script>`
  await expect(
    compileMpxSource(
      source,
      path.join(fixtureRoot, 'invalid-template-call.mpx'),
    ),
  ).rejects.toThrow('CallExpression grammar is not supported')
})

it.each(['wx', 'ali'])(
  'selects the active Mpx script for mode %s without merging scopes',
  async mode => {
    const source = `<script setup mode="wx">const props = defineProps({ platform: { type: String, value: 'wx' } }); defineExpose({ props })</script>
<script setup mode="ali">const props = defineProps({ platform: { type: String, value: 'ali' } }); defineExpose({ props })</script>`
    const fileName = path.join(fixtureRoot, 'mode-selection.mpx')
    const compiled = await compileMpxSource(source, fileName, mode)
    expect(runCompiledMpx(compiled.code, fileName).exposed).toEqual({
      props: { platform: mode },
    })
  },
)
