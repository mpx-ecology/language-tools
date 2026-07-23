import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import {
  type TestLanguageService,
  createTestLanguageService,
} from './utils/createTestLanguageService'

describe('JSON usingComponents codegen', () => {
  let service: TestLanguageService

  beforeAll(() => {
    service = createTestLanguageService()
  })

  afterAll(() => {
    service.dispose()
  })

  it('uses internal import names that do not collide with user imports', () => {
    const fileName = service.file('index.mpx')
    const { code } = service.getServiceScript('index.mpx')

    expect(code).toContain(
      'import __MPX_jsonComponent_0_0 from "./component-options.mpx"',
    )
    expect(code).toContain(
      "import ComponentOptions, { createComponent } from '@mpxjs/core'",
    )
    expect(code).not.toContain(
      'import ComponentOptions from "./component-options.mpx"',
    )
    expect(code).toContain('ComponentOptions: __MPX_jsonComponent_0_0,')

    const duplicateIdentifierDiagnostics = service.languageService
      .getSemanticDiagnostics(fileName)
      .filter(diagnostic =>
        [
          2300, // duplicate identifier
          2440, // import conflicts with local declaration
        ].includes(diagnostic.code),
      )
    expect(duplicateIdentifierDiagnostics).toEqual([])
  })

  it('resolves extensionless component and directory index paths', () => {
    const { code } = service.getServiceScript('index.mpx')

    expect(code).toContain(
      'import __MPX_jsonComponent_0_0 from "./component-options.mpx"',
    )
    expect(code).toContain(
      'import __MPX_jsonComponent_1_0 from "./component-index/index.mpx"',
    )
  })

  it('keeps multiple path candidates as a union', () => {
    const { code } = service.getServiceScript(
      'multiple-component-candidates.mpx',
    )

    expect(code).toContain(
      'import __MPX_jsonComponent_0_0 from "./component-candidate-options.mpx"',
    )
    expect(code).toContain(
      "import __MPX_jsonComponent_0_1 from './component-candidate-setup.mpx'",
    )
    expect(code).toContain(
      'MultiCandidate: __MPX_jsonComponent_0_0 as ' +
        'typeof __MPX_jsonComponent_0_0 | typeof __MPX_jsonComponent_0_1,',
    )
  })

  it('merges component tags that normalize to the same public name', () => {
    const fileName = service.file('normalized-component-names.mpx')
    const { code } = service.getServiceScript('normalized-component-names.mpx')

    expect(code).toContain(
      'FooBar: __MPX_jsonComponent_0_0 as ' +
        'typeof __MPX_jsonComponent_0_0 | typeof __MPX_jsonComponent_1_0,',
    )
    expect(code.match(/^FooBar:/gm)).toHaveLength(1)

    const duplicatePropertyDiagnostics = service.languageService
      .getSemanticDiagnostics(fileName)
      .filter(diagnostic => diagnostic.code === 1117)
    expect(duplicatePropertyDiagnostics).toEqual([])
  })
})
