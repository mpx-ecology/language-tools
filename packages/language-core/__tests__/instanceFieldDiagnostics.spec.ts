import path from 'node:path'
import * as ts from 'typescript'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import {
  duplicateInstanceFieldCode,
  forEachEmbeddedCode,
  getInstanceFieldDiagnostics,
} from '../src'
import {
  type TestLanguageService,
  createTestLanguageService,
} from './utils/createTestLanguageService'
import { proxyLanguageServiceForMpx } from '../../typescript-plugin/src/common'
import { compileMpxFixture } from './utils/compileMpxFixture'

const fixtureRoot = path.resolve(__dirname, 'fixtures/instance-fields')
describe('duplicate instance fields', () => {
  let service: TestLanguageService
  beforeAll(() => {
    service = createTestLanguageService(fixtureRoot)
  })
  afterAll(() => service.dispose())
  const diagnostics = (file: string) =>
    getInstanceFieldDiagnostics(
      ts,
      service.language,
      service.file(file),
      service.languageService.getProgram(),
    )

  it('warns for same-type keys across all three sources, with original spread declarations', () => {
    expect(
      service.proxyLanguageService.getSemanticDiagnostics(
        service.file('index.mpx'),
      ),
    ).toEqual([])
    const result = diagnostics('index.mpx')
    expect(result).toHaveLength(4)
    expect(result.map(d => d.messageText)).toEqual([
      "Instance field 'title' from defineExpose conflicts with props.",
      "Instance field 'count' from defineExpose conflicts with props.",
      "Instance field 'title' from onReactHooksExec conflicts with props, defineExpose.",
      "Instance field 'count' from onReactHooksExec conflicts with props, defineExpose.",
    ])
    for (const diagnostic of result) {
      expect(diagnostic.category).toBe(ts.DiagnosticCategory.Warning)
      expect(diagnostic.code).toBe(duplicateInstanceFieldCode)
      const key = diagnostic.file!.text.slice(
        diagnostic.start!,
        diagnostic.start! + diagnostic.length!,
      )
      expect(['title', 'count']).toContain(key)
      for (const related of diagnostic.relatedInformation!) {
        expect(
          related.file!.text.slice(
            related.start!,
            related.start! + related.length!,
          ),
        ).toBe(key)
      }
    }
    const proxy = proxyLanguageServiceForMpx(
      ts,
      service.language,
      service.proxyLanguageService,
      service.getServiceScript('index.mpx').root.mpxCompilerOptions,
      id => id,
    )
    expect(proxy.getSemanticDiagnostics(service.file('index.mpx'))).toEqual(
      result,
    )
  })

  it('keeps hover/navigation and isolates the verification-only mapping', () => {
    const source = service.read('index.mpx')
    const position = source.indexOf('{{ title') + 3
    const info = service.proxyLanguageService.getQuickInfoAtPosition(
      service.file('index.mpx'),
      position,
    )
    expect(ts.displayPartsToString(info?.displayParts)).toContain('string')
    const definitions = service.proxyLanguageService.getDefinitionAtPosition(
      service.file('index.mpx'),
      position,
    )
    expect(
      definitions?.some(
        d => d.textSpan.start === source.indexOf("title: 'hooks'"),
      ),
    ).toBe(true)
    const code = [
      ...forEachEmbeddedCode(service.getServiceScript('index.mpx').root),
    ].find(code => code.id === 'scriptsetup_diagnostics')!
    expect(code.mappings.length).toBeGreaterThan(0)
    for (const mapping of code.mappings) {
      expect(mapping.data.verification).toBe(true)
      expect(mapping.data.completion).toBeUndefined()
      expect(mapping.data.semantic).toBeUndefined()
      expect(mapping.data.navigation).toBeUndefined()
    }
  })

  it('tracks imported type fields, public names and aliased registrations, using only the final Hooks return', () => {
    const result = diagnostics('typed.mpx')
    expect(result).toHaveLength(2)
    expect(result[1].relatedInformation![1].file!.fileName).toBe(
      service.file('types.ts'),
    )
    expect(result[1].messageText).toContain('onReactHooksExec')
    expect(result.every(d => String(d.messageText).includes("'title'"))).toBe(
      true,
    )
    expect(
      result[0].file!.text.slice(
        result[0].start!,
        result[0].start! + result[0].length!,
      ),
    ).toBe('exposed')
  })

  it.each([
    'safe.mpx',
    'conditional.mpx',
    'local-hook.mpx',
    'uncertain-hook.mpx',
    'shadowed.mpx',
    'ignored-options.mpx',
    'prototype.mpx',
  ])(
    'does not warn about private names, unknown keys or guarded fields in %s',
    file => {
      expect(diagnostics(file)).toEqual([])
    },
  )

  it('checks defineOptions properties only when defineProps does not replace them', () => {
    expect(diagnostics('options-props.mpx')).toHaveLength(1)
    expect(diagnostics('ignored-options.mpx')).toEqual([])
  })

  it('recognizes a namespace import without confusing a shadowed alias', () => {
    expect(diagnostics('namespace.mpx')).toHaveLength(1)
    expect(diagnostics('alias.mpx')).toHaveLength(1)
    expect(diagnostics('javascript.mpx')).toHaveLength(1)
    expect(diagnostics('shadowed.mpx')).toEqual([])
  })

  it.each([
    'index.mpx',
    'typed.mpx',
    'safe.mpx',
    'options-props.mpx',
    'javascript.mpx',
    'alias.mpx',
    'namespace.mpx',
  ])('accepts actual Mpx script syntax in %s', async file => {
    await expect(
      compileMpxFixture(path.join(fixtureRoot, file)),
    ).resolves.toBeDefined()
  })
})
