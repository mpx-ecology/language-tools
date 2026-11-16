import path from 'node:path'
import * as ts from 'typescript'
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  type TestLanguageService,
  createTestLanguageService,
} from '../../language-core/__tests__/utils/createTestLanguageService'
import { proxyLanguageServiceForMpx } from '../src/common'

const fixtureRoot = path.resolve(
  __dirname,
  '../../language-core/__tests__/fixtures/definition-positions',
)
const services: TestLanguageService[] = []
afterEach(() => {
  for (const service of services.splice(0)) service.dispose()
})

function setup(serviceScriptOnly: boolean, eol = '\n') {
  const service = createTestLanguageService(
    fixtureRoot,
    [path.join(fixtureRoot, 'plain.ts')],
    new Map(),
    { serviceScriptOnly },
  )
  services.push(service)
  if (eol !== '\n')
    for (const name of ['index.mpx', 'panel.mpx', 'panel.ios.mpx', 'typed.mpx'])
      service.updateFile(name, service.read(name).replace(/\n/g, eol))
  const proxy = proxyLanguageServiceForMpx(
    ts,
    service.language,
    service.proxyLanguageService,
    service.getServiceScript('index.mpx').root.mpxCompilerOptions,
    id => id,
  )
  return { service, proxy }
}

// Use tsserver's real protocol serializer, including contextStart/contextEnd.
// Checking DefinitionInfo.textSpan alone misses offset-to-line regressions.
function protocolDefinitions(
  service: TestLanguageService,
  proxy: ts.LanguageService,
  search: string,
) {
  const source = service.read('index.mpx')
  const definitions = proxy.getDefinitionAndBoundSpan(
    service.file('index.mpx'),
    source.indexOf(search) + 2,
  )?.definitions
  expect(definitions?.length).toBeGreaterThan(0)
  const session = Object.create(ts.server.Session.prototype) as {
    mapDefinitionInfo(
      definitions: readonly ts.DefinitionInfo[],
      project: { getLanguageService(): ts.LanguageService },
    ): ts.server.protocol.FileSpanWithContext[]
  }
  return session.mapDefinitionInfo(definitions!, {
    getLanguageService: () => proxy,
  })
}

function sourceLocation(text: string, offset: number) {
  const sourceFile = ts.createSourceFile(
    'source.mpx',
    text,
    ts.ScriptTarget.Latest,
  )
  const { line, character } = sourceFile.getLineAndCharacterOfPosition(offset)
  return { line: line + 1, offset: character + 1 }
}

function expectProperty(
  service: TestLanguageService,
  definition: ts.server.protocol.FileSpanWithContext,
  property: string,
) {
  const source = service.read(path.basename(definition.file))
  const start = source.indexOf(property + ':', source.indexOf('defineProps'))
  expect(start).toBeGreaterThan(0)
  expect(definition.start).toEqual(sourceLocation(source, start))
  expect(definition.end).toEqual(
    sourceLocation(source, start + property.length),
  )
  expect(definition.contextStart).toEqual(sourceLocation(source, start))
  const contextEnd = source.indexOf(' }', start)
  expect(definition.contextEnd).toEqual(sourceLocation(source, contextEnd))
}

describe.each([false, true])(
  'definition protocol with serviceScriptOnly=%s',
  mode => {
    it.each(['\n', '\r\n'])('returns source line/columns for %j files', eol => {
      const { service, proxy } = setup(mode, eol)
      const definitions = protocolDefinitions(service, proxy, 'value=')
      expect(definitions.map(def => path.basename(def.file)).sort()).toEqual([
        'panel.ios.mpx',
        'panel.mpx',
      ])
      for (const definition of definitions)
        expectProperty(service, definition, 'value')
      const explicit = protocolDefinitions(
        service,
        proxy,
        'value="{{ numeric }}" />' + eol + '  <typed-panel',
      )
      expect(explicit).toHaveLength(1)
      expect(path.basename(explicit[0].file)).toBe('panel.ios.mpx')
      expectProperty(service, explicit[0], 'value')
      const typed = protocolDefinitions(service, proxy, 'label=')
      expect(typed).toHaveLength(1)
      expectProperty(service, typed[0], 'label')
      const local = protocolDefinitions(service, proxy, 'numeric }}')
      const source = service.read('index.mpx')
      expect(local).toHaveLength(1)
      expect(local[0].file).toBe(service.file('index.mpx'))
      const start = source.indexOf('numeric })')
      expect(local[0].start).toEqual(sourceLocation(source, start))
      expect(local[0].end).toEqual(
        sourceLocation(source, start + 'numeric'.length),
      )
      const file = service.file('plain.ts')
      const offset = service.read('plain.ts').indexOf('ordinary')
      expect(proxy.toLineColumnOffset!(file, offset)).toEqual(
        service.languageService.toLineColumnOffset!(file, offset),
      )
      const { root, code } = service.getServiceScript('index.mpx')
      expect(
        service.languageService
          .getProgram()!
          .getSourceFile(service.file('index.mpx'))!.text.length,
      ).toBe(code.length + (mode ? 0 : root.snapshot.getLength()))
    })

    it('refreshes source line/columns after target and parent edits', () => {
      const { service, proxy } = setup(mode)
      const read = (name: string) => service.read(name)
      protocolDefinitions(service, proxy, 'value=')
      service.updateFile(
        'panel.ios.mpx',
        '\r\n\r\n' + read('panel.ios.mpx').replace(/\n/g, '\r\n'),
      )
      service.updateFile(
        'panel.mpx',
        read('panel.mpx').replace('<template>', '<template>\n'),
      )
      service.updateFile('index.mpx', '\n' + read('index.mpx'))
      for (const definition of protocolDefinitions(service, proxy, 'value='))
        expectProperty(service, definition, 'value')
      const source = read('index.mpx')
      const local = protocolDefinitions(service, proxy, 'numeric }}')
      expect(local[0].start).toEqual(
        sourceLocation(source, source.indexOf('numeric })')),
      )
    })
  },
)

it('reuses the source line table for an unchanged snapshot', () => {
  const { service, proxy } = setup(true)
  const definitions = protocolDefinitions(service, proxy, 'value=')
  const file = service.file('panel.ios.mpx')
  const snapshot = service.language.scripts.get(file)!.snapshot
  const getText = vi.spyOn(snapshot, 'getText')
  const offset = service.read('panel.ios.mpx').indexOf('value:')
  for (let index = 0; index < 10; index++) {
    expect(proxy.toLineColumnOffset!(file, offset)).toEqual({
      line: 4,
      character: 14,
    })
  }
  expect(getText).not.toHaveBeenCalled()
  expect(definitions).toHaveLength(2)
})
