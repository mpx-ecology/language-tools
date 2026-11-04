import { describe, expect, it } from 'vitest'
import { MpxDiagnosticCode, resolveMpxDiagnosticCode } from '../src'

describe('public Mpx diagnostic codes', () => {
  it('pins existing and reserved IDs without implicit enum increments', () => {
    const codes = Object.values(MpxDiagnosticCode).filter(
      value => typeof value === 'number',
    )
    expect(codes).toEqual([1001, 1002, 1003, 4001, 4002, 5001, 5002])
    expect(new Set(codes).size).toBe(codes.length)
  })

  it.each([
    ['mpx-json', '4001', MpxDiagnosticCode.JsonPathNotFound],
    ['mpx-json-schema', 'config-value', MpxDiagnosticCode.JsonConfigValue],
    ['mpx', 'reserved-instance-data', MpxDiagnosticCode.ReservedInstanceData],
    ['mpx', 5001, MpxDiagnosticCode.DuplicateInstanceField],
  ])('resolves the audited %s / %s identity', (source, code, expected) => {
    expect(resolveMpxDiagnosticCode(source as string, code)).toBe(expected)
  })

  it.each([
    ['ts', 2339],
    ['ts', '4001'],
    ['json', 'config-value'],
    ['css', 'reserved-instance-data'],
    ['html', 24],
    ['mpx', '4001'],
    ['mpx-json', 'config-value'],
    ['mpx', 'future-rule'],
    [undefined, 'reserved-instance-data'],
    ['mpx', undefined],
    ['toString', '4001'],
    ['mpx', 'toString'],
    ['__proto__', '__proto__'],
  ])('preserves unrelated %s / %s identities', (source, code) => {
    expect(resolveMpxDiagnosticCode(source as string | undefined, code)).toBe(
      code,
    )
  })
})
