import path from 'node:path'
import * as ts from 'typescript'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { getComponentProps } from '../../typescript-plugin/src/requests/getComponentProps'
import { getComponentNames } from '../../typescript-plugin/src/requests/getComponentNames'
import type { RequestContext } from '../../typescript-plugin/src/requests/types'
import { compileMpxSource } from './utils/compileMpxFixture'
import {
  type TestLanguageService,
  createTestLanguageService,
} from './utils/createTestLanguageService'

const fixtureRoot = path.resolve(__dirname, 'fixtures/rn-components')
describe('registered React Native components', () => {
  let service: TestLanguageService
  let context: RequestContext
  beforeAll(() => {
    service = createTestLanguageService(fixtureRoot)
    context = {
      typescript: ts,
      language: service.language,
      languageService: service.languageService,
      languageServiceHost: service.languageServiceHost,
      isTsPlugin: false,
      getFileId: name => name,
    }
  })
  afterAll(() => service.dispose())
  it.each(['setup.ios.mpx', 'options.ios.mpx'])(
    'resolves aliases and React props in %s',
    file => {
      expect(getComponentNames.call(context, service.file(file))).toEqual(
        expect.arrayContaining([
          'NativeView',
          'FunctionAlias',
          'ClassAlias',
          'ForwardAlias',
        ]),
      )
      for (const tag of [
        'NativeView',
        'FunctionAlias',
        'ClassAlias',
        'ForwardAlias',
      ]) {
        const props =
          getComponentProps.call(context, service.file(file), tag) ?? []
        expect(props.find(prop => prop.name === 'onLayout')?.type).toContain(
          'LayoutChangeEvent',
        )
        if (tag !== 'NativeView')
          expect(props.find(prop => prop.name === 'title')).toMatchObject({
            type: 'string | undefined',
            commentMarkdown: 'Panel title.',
          })
      }
      expect(
        service.proxyLanguageService
          .getSemanticDiagnostics(service.file(file))
          .map(d => ts.flattenDiagnosticMessageText(d.messageText, '\n')),
      ).toEqual([])
    },
  )
  it('preserves required React props even when core reports its narrow registration constraint', () => {
    const file = service.file('required.ios.mpx')
    const props = getComponentProps.call(context, file, 'RequiredAlias') ?? []
    expect(props.find(prop => prop.name === 'title')).toMatchObject({
      type: 'string',
      required: true,
    })
    const diagnostics =
      service.proxyLanguageService.getSemanticDiagnostics(file)
    expect(diagnostics).toHaveLength(2)
    const messages = diagnostics.map(d =>
      ts.flattenDiagnosticMessageText(d.messageText, '\n'),
    )
    expect(messages.some(message => message.includes('ComponentType'))).toBe(
      true,
    )
    expect(messages).toContain(
      "Type 'number' is not assignable to type 'string'.",
    )
  })
  it('compiles the registered native aliases and callback prop with the Mpx RN compiler', async () => {
    const result = await compileMpxSource(
      service.read('setup.ios.mpx'),
      service.file('setup.ios.mpx'),
      'ios',
    )
    expect(result.code).toContain('createComponent')
    expect(result.code).toContain('NativeView: View')
    expect(result.wxml).toContain('onLayout')
  })
  it.each(['setup.ios.mpx', 'options.ios.mpx'])(
    'preserves native callback hover and member completion in %s',
    file => {
      const source = service.read(file)
      const fileName = service.file(file)
      for (const needle of [
        'NativeView testID',
        'onLayout=',
        'handleFooterLayout }}',
      ]) {
        const info = service.proxyLanguageService.getQuickInfoAtPosition(
          fileName,
          source.indexOf(needle) + 1,
        )
        expect(ts.displayPartsToString(info?.displayParts)).toContain(
          needle.startsWith('NativeView') ? 'typeof View' : 'LayoutChangeEvent',
        )
        expect(ts.displayPartsToString(info?.displayParts)).not.toContain(
          ': any',
        )
      }
      const position =
        source.indexOf('event.nativeEvent.layout.height') +
        'event.nativeEvent.layout.'.length
      expect(
        service.proxyLanguageService
          .getCompletionsAtPosition(fileName, position, {})
          ?.entries.map(entry => entry.name),
      ).toEqual(expect.arrayContaining(['height', 'width', 'x', 'y']))
      expect(getComponentNames.call(context, fileName)).not.toContain(
        'handleFooterLayout',
      )
    },
  )
  it('keeps one semantic/completion/verification mapping for defineOptions source', () => {
    const source = service.read('setup.ios.mpx')
    const offset = source.indexOf('NativeView:') + 1
    const root = service.getServiceScript('setup.ios.mpx').root
    const codes = [
      ...root.embeddedCodes.flatMap(code => [
        code,
        ...(code.embeddedCodes ?? []),
      ]),
    ]
    const script = codes.find(code => code.id === 'script_ts')!
    const mappings = script.mappings.filter(mapping =>
      mapping.sourceOffsets.some(
        (start, index) =>
          start <= offset && offset < start + mapping.lengths[index],
      ),
    )
    for (const capability of [
      'semantic',
      'completion',
      'verification',
    ] as const) {
      expect(mappings.filter(mapping => mapping.data[capability])).toHaveLength(
        1,
      )
    }
  })
  it.each(['setup.ios.mpx', 'options.ios.mpx'])(
    'continues navigation from registered values into React declarations in %s',
    file => {
      const source = service.read(file)
      for (const [needle, expectedFile] of [
        ['NativeView: View', 'View.d.ts'],
        ['FunctionAlias: FunctionPanel', 'components.ts'],
        ['ClassAlias: ClassPanel', 'components.ts'],
        ['ForwardAlias: ForwardPanel', 'components.ts'],
      ]) {
        const offset = source.indexOf(needle) + needle.indexOf(':') + 3
        const definitions =
          service.proxyLanguageService.getDefinitionAtPosition(
            service.file(file),
            offset,
          )
        expect(
          definitions?.some(definition =>
            definition.fileName.endsWith(expectedFile),
          ),
        ).toBe(true)
      }
    },
  )
  it('preserves declared global components alongside the RN registry in options API', () => {
    const withGlobals = createTestLanguageService(fixtureRoot, [
      path.join(fixtureRoot, 'global-components.d.ts'),
    ])
    try {
      const names = getComponentNames.call(
        {
          ...context,
          language: withGlobals.language,
          languageService: withGlobals.languageService,
          languageServiceHost: withGlobals.languageServiceHost,
        },
        withGlobals.file('options.ios.mpx'),
      )
      expect(names).toEqual(
        expect.arrayContaining(['GlobalNative', 'NativeView']),
      )
    } finally {
      withGlobals.dispose()
    }
  })
  it('checks native props and callback parameters', () => {
    const diagnostics = service.proxyLanguageService.getSemanticDiagnostics(
      service.file('errors.ios.mpx'),
    )
    expect(diagnostics.map(d => d.code)).toEqual([2322, 2322, 2322, 2322, 2322])
    expect(
      diagnostics
        .map(d => ts.flattenDiagnosticMessageText(d.messageText, '\n'))
        .join('\n'),
    ).toContain('LayoutChangeEvent')
  })
  it.each(['setup.ios.mpx', 'options.ios.mpx'])(
    'navigates to registration aliases in %s',
    file => {
      const source = service.read(file)
      for (const tag of [
        'NativeView',
        'FunctionAlias',
        'ClassAlias',
        'ForwardAlias',
      ]) {
        const definitions =
          service.proxyLanguageService.getDefinitionAtPosition(
            service.file(file),
            source.indexOf('<' + tag) + 2,
          )
        expect(definitions).toHaveLength(1)
        expect(definitions).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              fileName: service.file(file),
              textSpan: {
                start: source.indexOf(tag + ':'),
                length: tag.length,
              },
            }),
          ]),
        )
      }
    },
  )
})
