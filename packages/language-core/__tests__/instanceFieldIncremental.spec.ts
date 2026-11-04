import path from 'node:path'
import * as ts from 'typescript'
import { expect, it, vi } from 'vitest'
import { getInstanceFieldDiagnostics } from '../src'
import { createTestLanguageService } from './utils/createTestLanguageService'
import { instanceFieldSource } from './utils/instanceFieldSource'

const root = path.resolve(__dirname, 'fixtures/instance-fields')
const createService = () => createTestLanguageService(root)
type Service = ReturnType<typeof createService>
function diagnostics(service: Service, file: string) {
  service.proxyLanguageService.getSemanticDiagnostics(service.file(file))
  return getInstanceFieldDiagnostics(
    ts,
    service.language,
    service.file(file),
    service.languageService.getProgram(),
  )
}

it('keeps unrelated calls out of Hooks symbol resolution as the SFC grows', () => {
  const service = createService()
  try {
    for (const calls of [10, 1000]) {
      service.updateFile('index.mpx', instanceFieldSource(calls))
      service.proxyLanguageService.getSemanticDiagnostics(
        service.file('index.mpx'),
      )
      const program = service.languageService.getProgram()!
      const query = vi.spyOn(program.getTypeChecker(), 'getSymbolAtLocation')
      try {
        for (let repeat = 0; repeat < 3; repeat++) {
          expect(
            getInstanceFieldDiagnostics(
              ts,
              service.language,
              service.file('index.mpx'),
              program,
            ),
          ).toHaveLength(1)
        }
        expect(query).not.toHaveBeenCalled()
      } finally {
        query.mockRestore()
      }
    }
  } finally {
    service.dispose()
  }
})

it('refreshes warnings and exact source ranges after rename, removal and source shifts', () => {
  const service = createService()
  try {
    const source = service.read('alias.mpx')
    expect(diagnostics(service, 'alias.mpx')).toHaveLength(1)
    service.updateFile(
      'alias.mpx',
      source.replace("title: 'alias'", "renamed: 'alias'"),
    )
    expect(diagnostics(service, 'alias.mpx')).toEqual([])
    const shifted = '<!-- 编辑后的位移 -->\r\n' + source
    service.updateFile('alias.mpx', shifted)
    const result = diagnostics(service, 'alias.mpx')
    expect(result).toHaveLength(1)
    expect(result[0].start).toBe(shifted.indexOf("title: 'alias'"))
    expect(result[0].file!.text).toBe(shifted)
    expect(result[0].relatedInformation![0].start).toBe(
      shifted.indexOf('title: String'),
    )
    expect(diagnostics(service, 'alias.mpx')).toEqual(result)
  } finally {
    service.dispose()
  }
})

it('rechecks external types with unchanged setup syntax and reused generated nodes', () => {
  const service = createService()
  try {
    const original = service.read('types.ts')
    expect(diagnostics(service, 'typed.mpx')).toHaveLength(2)
    const ast = service.getServiceScript('typed.mpx').root.sfc.scriptSetup!.ast
    const file = service.languageService
      .getProgram()!
      .getSourceFile(service.file('typed.mpx'))
    service.updateFile(
      'types.ts',
      original.replace('title: string', 'renamed: string'),
    )
    const changed = diagnostics(service, 'typed.mpx')
    expect(changed).toHaveLength(1)
    expect(changed[0].messageText).toBe(
      "Instance field 'title' from onReactHooksExec conflicts with props.",
    )
    expect(
      service.getServiceScript('typed.mpx').root.sfc.scriptSetup!.ast,
    ).toBe(ast)
    expect(
      service.languageService
        .getProgram()!
        .getSourceFile(service.file('typed.mpx')),
    ).toBe(file)
    service.updateFile('types.ts', '// 类型声明移动\n' + original)
    const restored = diagnostics(service, 'typed.mpx')
    expect(restored).toHaveLength(2)
    const related = restored[1].relatedInformation!.find(info =>
      info.file!.fileName.endsWith('/types.ts'),
    )!
    expect(related.file!.text).toBe('// 类型声明移动\n' + original)
    expect(related.start).toBe(related.file!.text.indexOf('title: string'))
  } finally {
    service.dispose()
  }
})

it('invalidates Hooks identity and final-registration decisions after edits', () => {
  const service = createService()
  try {
    const alias = service.read('alias.mpx')
    expect(diagnostics(service, 'alias.mpx')).toHaveLength(1)
    service.updateFile(
      'alias.mpx',
      alias.replace(
        "import { onReactHooksExec } from '@mpxjs/core'",
        'function onReactHooksExec(callback: () => object) { return callback() }',
      ),
    )
    expect(diagnostics(service, 'alias.mpx')).toEqual([])
    service.updateFile('alias.mpx', alias)
    expect(diagnostics(service, 'alias.mpx')).toHaveLength(1)

    const safe = service.read('safe.mpx')
    const final = 'onReactHooksExec(() => ({ finalOnly: 1 }))'
    expect(diagnostics(service, 'safe.mpx')).toEqual([])
    service.updateFile('safe.mpx', safe.replace(final, ''))
    expect(diagnostics(service, 'safe.mpx')).toHaveLength(1)
    service.updateFile(
      'safe.mpx',
      safe.replace(final, 'if (Math.random() > 0.5) ' + final),
    )
    expect(diagnostics(service, 'safe.mpx')).toEqual([])
    service.updateFile('safe.mpx', safe)
    expect(diagnostics(service, 'safe.mpx')).toEqual([])
  } finally {
    service.dispose()
  }
})

it('bounds AST lookup work for many real Hooks and reuses unchanged syntax', () => {
  const service = createService()
  const calls = 1000
  try {
    const source = `<script setup lang="ts">
import { onReactHooksExec } from '@mpxjs/core'
defineProps({ title: String })
defineExpose({})
${Array.from({ length: calls }, (_, i) => `onReactHooksExec(() => ({ title: 'hook${i}' }))`).join('\n')}
</script>`
    service.updateFile('index.mpx', source)
    service.proxyLanguageService.getSemanticDiagnostics(
      service.file('index.mpx'),
    )
    const program = service.languageService.getProgram()!
    let walks = 0
    const forEachChild: typeof ts.forEachChild = (
      node,
      callback,
      callbacks,
    ) => {
      walks++
      return ts.forEachChild(node, callback, callbacks)
    }
    const observed = { ...ts, forEachChild }
    const query = vi.spyOn(program.getTypeChecker(), 'getAliasedSymbol')
    try {
      const first = getInstanceFieldDiagnostics(
        observed,
        service.language,
        service.file('index.mpx'),
        program,
      )
      expect(first).toHaveLength(1)
      expect(first[0].start).toBe(source.lastIndexOf("title: 'hook"))
      expect(query).toHaveBeenCalledTimes(1)
      expect(walks).toBeLessThan(calls * 4 + 100)
      const initialWalks = walks
      expect(
        getInstanceFieldDiagnostics(
          observed,
          service.language,
          service.file('index.mpx'),
          program,
        ),
      ).toEqual(first)
      expect(walks).toBe(initialWalks)
    } finally {
      query.mockRestore()
    }
  } finally {
    service.dispose()
  }
})
