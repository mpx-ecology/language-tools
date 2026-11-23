import path from 'node:path'
import * as ts from 'typescript'
import { expect, it } from 'vitest'
import { proxyLanguageServiceForMpx } from '../../typescript-plugin/src/common'
import { createTestLanguageService } from './utils/createTestLanguageService'

it('checks RN style bindings like view bindings and preserves component props checks', () => {
  const service = createTestLanguageService(
    path.resolve(__dirname, 'fixtures/rn-template-style'),
  )
  try {
    const fixture = 'conditional.mpx'
    const { root } = service.getServiceScript(fixture)
    const proxy = proxyLanguageServiceForMpx(
      ts,
      service.language,
      service.proxyLanguageService,
      root.mpxCompilerOptions,
      id => id,
    )
    const source = service.read(fixture)
    const sourceFile = ts.createSourceFile(
      fixture,
      source,
      ts.ScriptTarget.Latest,
    )
    const templateEnd = source.indexOf('</template>')
    const diagnostics = proxy
      .getSemanticDiagnostics(service.file(fixture))
      .filter(diagnostic => diagnostic.start! < templateEnd)

    expect(
      diagnostics.map(diagnostic => ({
        line:
          sourceFile.getLineAndCharacterOfPosition(diagnostic.start!).line + 1,
        code: diagnostic.code,
      })),
    ).toEqual([
      { line: 3, code: 2339 },
      { line: 4, code: 2322 },
      { line: 8, code: 2345 },
      { line: 10, code: 2345 },
    ])
    expect(
      proxy.getSemanticDiagnostics(service.file('direct.ios.mpx')),
    ).toEqual([])
  } finally {
    service.dispose()
  }
})
