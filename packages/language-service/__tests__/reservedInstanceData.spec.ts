import {
  createLanguage,
  createLanguageService,
  createUriMap,
} from '@volar/language-service'
import {
  createMpxLanguagePlugin,
  getDefaultCompilerOptions,
} from '@mpxjs/language-core'
import * as ts from 'typescript'
import fs from 'node:fs'
import path from 'node:path'
import { TextDocument } from 'vscode-languageserver-textdocument'
import { URI } from 'vscode-uri'
import { describe, expect, it } from 'vitest'
import { create as createSfcPlugin } from '../src/plugins/mpx-sfc'
import { create as createReservedInstanceDataPlugin } from '../src/plugins/mpx-reserved-instance-data'
import {
  compileMpxFixture,
  compileMpxSource,
  runCompiledMpx,
} from '../../language-core/__tests__/utils/compileMpxFixture'
import { createTestLanguageService } from '../../language-core/__tests__/utils/createTestLanguageService'

const fixtureRoot = path.join(__dirname, 'fixtures/reserved-instance-data')

async function diagnose(source: string) {
  const uri = URI.file('/reserved-instance-data.mpx')
  const language = createLanguage(
    [
      createMpxLanguagePlugin<URI>(
        ts,
        {},
        getDefaultCompilerOptions(),
        uri => uri.fsPath,
      ),
    ],
    createUriMap(),
    () => {},
  )
  language.scripts.set(uri, ts.ScriptSnapshot.fromString(source), 'mpx')
  const service = createLanguageService(
    language,
    [createSfcPlugin(), createReservedInstanceDataPlugin(ts)],
    { workspaceFolders: [] },
    {},
  )
  try {
    const document = TextDocument.create(uri.toString(), 'mpx', 0, source)
    const diagnostics = await service.getDiagnostics(uri)
    return { document, diagnostics }
  } finally {
    service.dispose()
  }
}

describe('reserved instance data warning', () => {
  it('warns on the public key exposed by defineExpose', async () => {
    const { document, diagnostics } =
      await diagnose(`<template><view /></template>
<script setup lang="ts">
const localValue = 1
defineExpose({ data: localValue })
</script>`)
    expect(diagnostics).toEqual([
      expect.objectContaining({
        severity: 2,
        code: 'reserved-instance-data',
        source: 'mpx',
      }),
    ])
    expect(document.getText(diagnostics[0].range)).toBe('data')
  })

  const setupCases = [
    ['implicit top-level var', 'var /*warn*/data = 1; defineExpose()'],
    [
      'hoisted var is not in compiler implicit bindings',
      'if (true) { var data = 1 }; defineExpose()',
    ],
    ['implicit exposed binding', 'const /*warn*/data = 1; defineExpose()'],
    [
      'implicit private alias',
      'const { data: renamed } = { data: 1 }; defineExpose()',
    ],
    [
      'implicit binding name',
      'const { value: /*warn*/data } = { value: 1 }; defineExpose()',
    ],
    [
      'ignored defineOptions setup',
      'defineOptions({ setup() { return { data: 1 } } }); defineExpose({})',
    ],
    [
      'destructured private alias',
      'const { data: renamed } = { data: 1 }; defineExpose({ renamed })',
    ],
    [
      'destructured public prop alias',
      'const { data: renamed } = defineProps({ /*warn*/data: String }); defineExpose({ renamed })',
    ],
    [
      'separate value and type',
      'const fields = { /*warn*/data: 1 }; type fields = number; defineExpose(fields)',
    ],
    [
      'named callback shadow',
      "import { onReactHooksExec } from '@mpxjs/core'; const fields = { data: 1 }; const useValues = function fields() { return fields }; onReactHooksExec(useValues); defineExpose({})",
    ],
    ['expose shorthand', 'const data = 1; defineExpose({ /*warn*/data })'],
    [
      'public alias',
      'const renamed = 1; defineExpose({ /*warn*/data: renamed })',
    ],
    ['private alias', 'const data = 1; defineExpose({ renamed: data })'],
    [
      'nested object',
      'const data = { data: 1 }; defineExpose({ publicValue: data })',
    ],
    ['string key', "defineExpose({ /*warn*/'data': 1 })"],
    ['computed literal', "defineExpose({ [/*warn*/'data']: 1 })"],
    ['const key', "const key = 'data'; defineExpose({ [/*warn*/key]: 1 })"],
    [
      'const object alias',
      'const fields = { /*warn*/data: 1 }; const exposed = fields; defineExpose(exposed)',
    ],
    [
      'static spread',
      'const fields = { /*warn*/data: 1 }; defineExpose({ ...fields, other: 2 })',
    ],
    ['inline spread', 'defineExpose({ ...{ /*warn*/data: 1 } })'],
    [
      'unknown spread preserves explicit key',
      "import unknown from './unknown'; defineExpose({ /*warn*/data: 1, ...unknown })",
    ],
    [
      'deduplicate spread',
      'const fields = { /*warn*/data: 1 }; defineExpose({ ...fields, ...fields })',
    ],
    [
      'runtime props',
      "defineProps({ /*warn*/data: { type: String, value: '' } }); defineExpose({})",
    ],
    ['type props', 'defineProps<{ /*warn*/data: string }>(); defineExpose({})'],
    [
      'local type props',
      'interface Props { /*warn*/data?: number }; defineProps<Props>(); defineExpose({})',
    ],
    [
      'local alias type props',
      'type Props = { /*warn*/data: string }; type PublicProps = Props; defineProps<PublicProps>(); defineExpose({})',
    ],
    [
      'withDefaults',
      "withDefaults(defineProps<{ /*warn*/data?: string }>(), { data: '' }); defineExpose({})",
    ],
    [
      'all requested sources',
      "import { onReactHooksExec } from '@mpxjs/core'; defineProps({ /*warn*/data: String }); defineExpose({ /*warn*/data: 1 }); onReactHooksExec(() => ({ /*warn*/data: 2 }))",
    ],
    [
      'hooks block return',
      "import { onReactHooksExec } from '@mpxjs/core'; onReactHooksExec(() => { return { /*warn*/data: 1 } }); defineExpose({})",
    ],
    [
      'hooks import alias',
      "import { onReactHooksExec as registerHooks } from '@mpxjs/core'; registerHooks(() => ({ /*warn*/data: 1 })); defineExpose({})",
    ],
    [
      'hooks namespace',
      "import * as mpx from '@mpxjs/core'; mpx.onReactHooksExec(() => ({ /*warn*/data: 1 })); defineExpose({})",
    ],
    [
      'hooks callback alias',
      "import { onReactHooksExec } from '@mpxjs/core'; const useValues = () => { const result = { /*warn*/data: 1 }; return { ...result } }; onReactHooksExec(useValues); defineExpose({})",
    ],
    [
      'hooks function declaration',
      "import { onReactHooksExec } from '@mpxjs/core'; function useValues() { return { /*warn*/data: 1 } }; onReactHooksExec(useValues); defineExpose({})",
    ],
    [
      'hooks parameter shadow',
      "import { onReactHooksExec } from '@mpxjs/core'; const result = { data: 1 }; onReactHooksExec((result) => result); defineExpose({})",
    ],
    [
      'nested function is private',
      "import { onReactHooksExec } from '@mpxjs/core'; onReactHooksExec(() => { function privateValues() { return { data: 1 } }; return { safe: privateValues } }); defineExpose({})",
    ],
    [
      'local hooks function',
      'function onReactHooksExec(fn) { return fn() }; onReactHooksExec(() => ({ data: 1 })); defineExpose({})',
    ],
    [
      'wrong hook module',
      "import { onReactHooksExec } from './local'; onReactHooksExec(() => ({ data: 1 })); defineExpose({})",
    ],
    [
      'async hooks',
      "import { onReactHooksExec } from '@mpxjs/core'; onReactHooksExec(async () => ({ data: 1 })); defineExpose({})",
    ],
    [
      'private local and id/dataset',
      'const data = 1; const privateObject = { data }; defineExpose({ renamed: data, id: 1, dataset: {} })',
    ],
    [
      'dynamic expose',
      'declare function load(): { data: number }; defineExpose(load())',
    ],
    ['external expose', "import fields from './unknown'; defineExpose(fields)"],
    [
      'mutable object alias',
      'let fields = { data: 1 }; fields = {}; defineExpose(fields)',
    ],
    [
      'deleted key',
      'const fields = { data: 1 }; delete fields.data; defineExpose(fields)',
    ],
    [
      'deleted key through alias',
      'const fields = { data: 1 }; const alias = fields; delete alias.data; defineExpose(fields)',
    ],
    ['cyclic spread', 'const fields = { ...fields }; defineExpose(fields)'],
    [
      'defineOptions data container',
      'defineOptions({ data: { count: 1 }, methods: { show() {} } }); defineExpose({})',
    ],
    [
      'defineOptions data field',
      'defineOptions({ data: { /*warn*/data: 1 } }); defineExpose({})',
    ],
    [
      'defineOptions properties',
      'defineOptions({ properties: { /*warn*/data: String } }); defineExpose({})',
    ],
    [
      'ignored defineOptions properties',
      'defineOptions({ properties: { data: String } }); defineProps({ title: String }); defineExpose({})',
    ],
    [
      'text is not a props macro',
      "const note = 'defineProps'; defineOptions({ properties: { /*warn*/data: String } }); defineExpose({ note })",
    ],
  ]

  const optionsCases = [
    [
      'injected public field',
      "createComponent({ inject: { /*warn*/data: 'value' } })",
    ],
    [
      'injection source is not public name',
      "createComponent({ inject: { renamed: 'data' } })",
    ],
    ['injected array', "createComponent({ inject: [/*warn*/'data'] })"],
    [
      'provide is not an instance field',
      'createComponent({ provide: { data: 1 } })',
    ],
    [
      'imported constructor alias',
      "import { createComponent as make } from '@mpxjs/core'; make({ data: { /*warn*/data: 1 } })",
    ],
    [
      'constructor namespace',
      "import * as mpx from '@mpxjs/core'; mpx.createComponent({ data: { /*warn*/data: 1 } })",
    ],
    ['props', 'createComponent({ props: { /*warn*/data: String } })'],
    [
      'properties',
      'createComponent({ properties: { /*warn*/data: { type: String, value: "" } } })',
    ],
    ['data object', 'createComponent({ data: { /*warn*/data: 1 } })'],
    [
      'data function',
      'createComponent({ data() { return { /*warn*/data: 1 } } })',
    ],
    ['dataFn', 'createComponent({ dataFn: () => ({ /*warn*/data: 1 }) })'],
    [
      'initData is not proxied onto the instance',
      'createComponent({ initData: { data: 1 } })',
    ],
    [
      'computed',
      'createComponent({ computed: { /*warn*/data() { return 1 } } })',
    ],
    ['methods', 'createComponent({ methods: { /*warn*/data() {} } })'],
    [
      'setup return',
      'createComponent({ setup() { return { /*warn*/data: 1 } } })',
    ],
    [
      'setup local alias',
      'createComponent({ setup() { const fields = { /*warn*/data: 1 }; return fields } })',
    ],
    [
      'setup hooks',
      'createComponent({ setup() { onReactHooksExec(() => ({ /*warn*/data: 1 })); return {} } })',
    ],
    [
      'option hooks',
      'createComponent({ reactHooksExec() { return { /*warn*/data: 1 } } })',
    ],
    ['page', 'createPage({ data: { /*warn*/data: 1 } })'],
    [
      'options alias',
      'const opts = { data: { /*warn*/data: 1 } }; createComponent(opts)',
    ],
    [
      'options spread',
      'const opts = { data: { /*warn*/data: 1 } }; createComponent({ ...opts, methods: {} })',
    ],
    [
      'unknown section override',
      "import unknown from './unknown'; createComponent({ data: { data: 1 }, ...unknown })",
    ],
    [
      'overridden section',
      'createComponent({ ...{ data: { data: 1 } }, data: { safe: 1 } })',
    ],
    [
      'local type exports',
      'export const data = 1; export default { data }; const privateObject = { data }',
    ],
    [
      'safe options',
      'createComponent({ data: { count: 1 }, setup() { const data = 1; return { count: data } }, methods: { show() {} } })',
    ],
    [
      'unmounted callback',
      'function unrelated() { return { data: 1 } }; const onReactHooksExec = unrelated',
    ],
    [
      'ordinary script expose',
      'function defineExpose(value) { return value }; defineExpose({ data: 1 })',
    ],
    [
      'unrelated constructor',
      'function localComponent(value) { return value }; localComponent({ data: { data: 1 } })',
    ],
  ]

  it.each([
    ...setupCases.map(([name, script]) => ({ name, script, setup: true })),
    ...optionsCases.map(([name, script]) => ({ name, script, setup: false })),
  ])('$name (setup: $setup)', async ({ script, setup }) => {
    const source = `<template><view /></template>\n<script${setup ? ' setup' : ''} lang="ts">\n${setup ? '' : "import { createComponent, createPage, onReactHooksExec } from '@mpxjs/core';\n"}${script}\n</script>`
    const { document, diagnostics } = await diagnose(source)
    const expected = [
      ...source.matchAll(/\/\*warn\*\/(\w+|'[^']+'|"[^"]+")/g),
    ].map(match => {
      const start = match.index! + '/*warn*/'.length
      return {
        start: document.positionAt(start),
        end: document.positionAt(start + match[1].length),
      }
    })
    expect(
      diagnostics
        .map(d => d.range)
        .sort(
          (a, b) => document.offsetAt(a.start) - document.offsetAt(b.start),
        ),
    ).toEqual(expected)
    for (const diagnostic of diagnostics) {
      expect(diagnostic).toMatchObject({
        severity: 2,
        code: 'reserved-instance-data',
        source: 'mpx',
      })
      expect(diagnostic.message).toContain('"data"')
    }
  })

  it('diagnoses JavaScript setup without requiring TypeScript inference', async () => {
    const { document, diagnostics } = await diagnose(
      '<script setup>const data = 1; defineExpose({ data })</script>',
    )
    expect(diagnostics).toHaveLength(1)
    expect(document.getText(diagnostics[0].range)).toBe('data')
  })

  it('matches actual no-argument expose and generated setup precedence', async () => {
    for (const [source, exposed] of [
      ['<script setup>const data = 1; defineExpose()</script>', { data: 1 }],
      ['<script setup>if (true) { var data = 1 }; defineExpose()</script>', {}],
      [
        '<script setup>defineOptions({ setup() { return { data: 1 } } }); defineExpose({})</script>',
        {},
      ],
    ] as const) {
      const file = path.join(fixtureRoot, 'implicit-expose.mpx')
      const compiled = await compileMpxSource(source, file)
      expect(runCompiledMpx(compiled.code, file).exposed).toEqual(exposed)
    }
  })

  it.each(['expose.mpx', 'props.mpx', 'hooks.mpx'])(
    'uses independent, compiler-valid Mpx fixture %s',
    async file => {
      const fileName = path.join(fixtureRoot, file)
      const source = fs.readFileSync(fileName, 'utf8')
      const { document, diagnostics } = await diagnose(source)
      expect(diagnostics).toHaveLength(1)
      expect(document.getText(diagnostics[0].range)).toBe('data')
      const compiled = await compileMpxFixture(fileName)
      expect(compiled.code).toContain('createComponent')
      if (file === 'expose.mpx')
        expect(runCompiledMpx(compiled.code, fileName).exposed).toEqual({
          data: 2,
          renamed: 1,
          count: 3,
        })
      if (file === 'props.mpx')
        expect(runCompiledMpx(compiled.code, fileName).defaults).toEqual({
          data: '',
          title: 'Mpx',
        })
    },
  )

  it('retains template hover and precise source definitions for safe public aliases', () => {
    const fixture = createTestLanguageService(fixtureRoot, [
      path.resolve(
        __dirname,
        '../../language-core/node_modules/@mpxjs/core/@types/index.d.ts',
      ),
    ])
    try {
      const file = fixture.file('expose.mpx')
      const source = fixture.read('expose.mpx')
      expect(
        fixture.proxyLanguageService.getSemanticDiagnostics(file).map(d => ({
          code: d.code,
          message: ts.flattenDiagnosticMessageText(d.messageText, '\n'),
        })),
      ).toEqual([])
      const position = source.indexOf('{{ renamed }}') + 4
      expect(
        ts.displayPartsToString(
          fixture.proxyLanguageService.getQuickInfoAtPosition(file, position)
            ?.displayParts,
        ),
      ).toContain('number')
      const definitions = fixture.proxyLanguageService.getDefinitionAtPosition(
        file,
        position,
      )
      expect(definitions).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            fileName: file,
            textSpan: {
              start: source.indexOf('renamed: data'),
              length: 'renamed'.length,
            },
          }),
        ]),
      )
    } finally {
      fixture.dispose()
    }
  })
})
