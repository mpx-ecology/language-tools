import path from 'node:path'
import * as ts from 'typescript'
import { expect, it } from 'vitest'
import { forEachEmbeddedCode } from '@mpxjs/language-core'
import { createTestLanguageService } from '../../language-core/__tests__/utils/createTestLanguageService'
import { getPropertiesAtLocation } from '../src/requests/getPropertiesAtLocation'
import { collectExtractProps } from '../src/requests/collectExtractProps'
import type { RequestContext } from '../src/requests/types'

it.each([false, true])(
  'keeps TS plugin requests and source navigation correct with serviceScriptOnly=%s',
  serviceScriptOnly => {
    const service = createTestLanguageService(
      path.resolve(
        __dirname,
        '../../language-core/__tests__/fixtures/template-completion',
      ),
      [],
      new Map(),
      { serviceScriptOnly },
    )
    const file = service.file('index.mpx')
    const source = service.read('index.mpx')
    const context: RequestContext = {
      typescript: ts,
      language: service.language,
      languageService: service.languageService,
      languageServiceHost: service.languageServiceHost,
      isTsPlugin: true,
      getFileId: id => id,
    }
    try {
      const { root } = service.getServiceScript('index.mpx')
      const properties = getPropertiesAtLocation.call(
        context,
        file,
        source.indexOf('profile.name') + 'profile'.length,
      )
      expect(properties).toContain('name')
      const extracted = collectExtractProps.call(context, file, [
        0,
        root.sfc.template!.content.length,
      ])
      expect(extracted).toContainEqual(
        expect.objectContaining({ name: 'propTitle', type: 'string' }),
      )
      const at = source.indexOf('profile.name') + 'profile.'.length + 1
      const hover = service.proxyLanguageService.getQuickInfoAtPosition(
        file,
        at,
      )
      expect(ts.displayPartsToString(hover?.displayParts)).toContain(
        'name: string',
      )
      const definitions = service.proxyLanguageService.getDefinitionAtPosition(
        file,
        at,
      )
      expect(
        definitions?.some(
          def =>
            def.fileName === file &&
            source.slice(
              def.textSpan.start,
              def.textSpan.start + def.textSpan.length,
            ) === 'name',
        ),
      ).toBe(true)
      const programFile = service.languageService
        .getProgram()!
        .getSourceFile(file)!
      const script = [...forEachEmbeddedCode(root)].find(
        code => code.id === 'script_ts',
      )!
      expect(programFile.text.length).toBe(
        script.snapshot.getLength() +
          (serviceScriptOnly ? 0 : root.snapshot.getLength()),
      )
    } finally {
      service.dispose()
    }
  },
)
