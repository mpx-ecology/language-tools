import * as ts from 'typescript'
import { describe, expect, it } from 'vitest'
import { parseBindingRanges } from '../src/parsers/scriptSetupRanges'

function bindingNames(source: string) {
  const ast = ts.createSourceFile(
    'bindings.ts',
    source,
    ts.ScriptTarget.Latest,
    true,
  )
  return parseBindingRanges(ts, ast).map(({ range }) =>
    source.slice(range.start, range.end),
  )
}

describe('script setup bindings', () => {
  it.each([
    [
      'blocks',
      'var root; if (true) { var defineProps; { var withDefaults } }',
      ['root', 'defineProps', 'withDefaults'],
    ],
    [
      'loops',
      'for (var defineProps = 0; false;) {} for (var withDefaults of []) {} for (var { mpxProps } of []) {} for (var mpxDefaults in {}) {}',
      ['defineProps', 'withDefaults', 'mpxProps', 'mpxDefaults'],
    ],
    [
      'try and switch',
      'try { var defineProps } catch (error) { var withDefaults } finally { var mpxProps } switch (0) { case 0: var mpxDefaults }',
      ['defineProps', 'withDefaults', 'mpxProps', 'mpxDefaults'],
    ],
    [
      'while and labels',
      'while (false) { var defineProps } do { var withDefaults } while (false); label: { var { props: mpxProps } = {} }',
      ['defineProps', 'withDefaults', 'mpxProps'],
    ],
  ] as const)(
    'collects hoisted var declarations in %s',
    (_label, source, expected) => {
      expect(bindingNames(source)).toEqual(expected)
    },
  )

  it.each([
    'function local() { var defineProps; var withDefaults }',
    'const local = () => { var defineProps; var withDefaults }',
    'class Local { static { var defineProps } method() { var withDefaults } }',
    'namespace Local { export var defineProps; export var withDefaults }',
    'if (true) { let defineProps; const withDefaults = 1 } try {} catch (defineProps) {}',
  ])('keeps nested scopes and block-scoped declarations local: %s', source => {
    expect(bindingNames(source)).not.toContain('defineProps')
    expect(bindingNames(source)).not.toContain('withDefaults')
  })
})
