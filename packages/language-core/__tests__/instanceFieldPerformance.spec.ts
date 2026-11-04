import { execFileSync } from 'node:child_process'
import { writeFileSync } from 'node:fs'
import path from 'node:path'
import { performance } from 'node:perf_hooks'
import * as ts from 'typescript'
import { expect, it } from 'vitest'
import { MpxVirtualCode, getInstanceFieldDiagnostics } from '../src'
import { createTestLanguageService } from './utils/createTestLanguageService'
import { instanceFieldSource } from './utils/instanceFieldSource'

const root = path.resolve(__dirname, 'fixtures/instance-fields')
const median = (values: number[]) =>
  [...values].sort((a, b) => a - b)[Math.floor(values.length / 2)]

// Opt in: timing is evidence for review, not a flaky CI wall-clock threshold.
// Compare the old and current analyzers using the SAME TS host/code generation.
it.skipIf(!process.env.MPX_INSTANCE_FIELD_BENCHMARK)(
  'compares warm and post-edit diagnostics against the previous PR revision',
  () => {
    const revision = process.env.MPX_INSTANCE_FIELD_BASE ?? '470faab'
    if (!/^[0-9a-f]{7,40}$/.test(revision))
      throw new Error('Expected a commit SHA')
    const baselineSource = execFileSync(
      'git',
      [
        'show',
        `${revision}:packages/language-core/src/utils/instanceFieldDiagnostics.ts`,
      ],
      { encoding: 'utf8' },
    )
    const exports: {
      getInstanceFieldDiagnostics?: typeof getInstanceFieldDiagnostics
    } = {}
    const code = ts.transpileModule(baselineSource, {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2021,
      },
    }).outputText
    new Function('require', 'exports', code)((id: string) => {
      if (id === '../virtualFile/mpxFile') return { MpxVirtualCode }
      throw new Error(`Unexpected baseline dependency: ${id}`)
    }, exports)
    const baseline = exports.getInstanceFieldDiagnostics!
    const rows: object[] = []
    for (const calls of [100, 500, 1000]) {
      const oldService = createTestLanguageService(root)
      const newService = createTestLanguageService(root)
      const services = [oldService, newService]
      const analyzers = [baseline, getInstanceFieldDiagnostics]
      const warm: number[][] = [[], []]
      const edited: number[][] = [[], []]
      const total: number[][] = [[], []]
      function run(which: number, edit?: number) {
        const service = services[which]
        const file = service.file('index.mpx')
        const start = performance.now()
        if (edit !== undefined)
          service.updateFile('index.mpx', instanceFieldSource(calls, edit))
        service.proxyLanguageService.getSemanticDiagnostics(file)
        const program = service.languageService.getProgram()
        const checked = performance.now()
        const result = analyzers[which](ts, service.language, file, program)
        const end = performance.now()
        expect(result).toHaveLength(1)
        expect(result[0].messageText).toBe(
          "Instance field 'title' from defineExpose conflicts with props.",
        )
        expect(result[0].start).toBe(
          service.read('index.mpx').indexOf("title: 'exposed'"),
        )
        return { extra: end - checked, total: end - start }
      }
      try {
        for (const service of services)
          service.updateFile('index.mpx', instanceFieldSource(calls))
        for (let round = 0; round < 10; round++) {
          for (const which of round % 2 ? [1, 0] : [0, 1]) {
            const result = run(which)
            if (round >= 2) warm[which].push(result.extra)
          }
        }
        for (let round = 0; round < 10; round++) {
          for (const which of round % 2 ? [1, 0] : [0, 1]) {
            const result = run(which, round + 1)
            if (round >= 2) {
              edited[which].push(result.extra)
              total[which].push(result.total)
            }
          }
        }
        const number = (values: number[]) => +median(values).toFixed(3)
        rows.push({
          calls,
          warmBeforeMs: number(warm[0]),
          warmAfterMs: number(warm[1]),
          editExtraBeforeMs: number(edited[0]),
          editExtraAfterMs: number(edited[1]),
          editTotalBeforeMs: number(total[0]),
          editTotalAfterMs: number(total[1]),
        })
      } finally {
        for (const service of services) service.dispose()
      }
    }
    const output = JSON.stringify(
      {
        baseline: revision,
        node: execFileSync('node', ['--version'], { encoding: 'utf8' }).trim(),
        typescript: ts.version,
        samples: 8,
        warmups: 2,
        rows,
      },
      null,
      2,
    )
    console.log(output)
    if (process.env.MPX_INSTANCE_FIELD_OUTPUT)
      writeFileSync(process.env.MPX_INSTANCE_FIELD_OUTPUT, output + '\n')
  },
  120_000,
)
