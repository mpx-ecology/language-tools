import fs from 'node:fs'
import path from 'node:path'
import * as ts from 'typescript'
import { describe, expect, it, vi } from 'vitest'
import {
  type Diagnostic,
  type LanguageServiceContext,
  type LanguageServicePlugin,
  createLanguage,
  createLanguageService,
  createUriMap,
} from '@volar/language-service'
import {
  createMpxLanguagePlugin,
  getDefaultCompilerOptions,
} from '@mpxjs/language-core'
import { MpxDiagnosticCode } from '@mpxjs/language-shared'
import { TextDocument } from 'vscode-languageserver-textdocument'
import { URI } from 'vscode-uri'
import {
  MpxErrorCodes,
  createMpxCompilerError,
} from '../../language-core/src/utils/errors'
import { withNumericMpxDiagnosticCodes } from '../src/utils/diagnosticCodes'
import { create as createJsonLinks } from '../src/plugins/mpx-sfc-json-links'
import { create as createJson } from '../src/plugins/mpx-sfc-json-json'
import { create as createTemplateErrors } from '../src/plugins/mpx-sfc-template-compiler-errors'

const token = {
  isCancellationRequested: false,
  onCancellationRequested: () => ({ dispose() {} }),
}
const document = TextDocument.create(
  'file:///diagnostic-codes.mpx',
  'mpx',
  0,
  '<template><view /></template>',
)
const context = {} as LanguageServiceContext
const range = {
  start: { line: 0, character: 10 },
  end: { line: 0, character: 14 },
}
const fixtureRoot = path.join(__dirname, 'fixtures/diagnostic-codes')

function diagnostic(source: string, code: string | number): Diagnostic {
  return {
    source,
    code,
    range,
    severity: 2,
    message: 'Original message',
    tags: [1],
    relatedInformation: [
      {
        location: { uri: 'file:///other.ts', range },
        message: 'Other declaration',
      },
    ],
    codeDescription: { href: 'https://example.com/original' },
    data: { original: true },
  }
}

describe('Mpx diagnostic-code migration', () => {
  it.each([
    [MpxErrorCodes.TEMPLATE_WX_FOR_VALUE_BRACE, 1001],
    [MpxErrorCodes.TEMPLATE_WX_IF_VALUE_BRACE, 1002],
    [MpxErrorCodes.TEMPLATE_WX_IF_NO_ADJACENT_BRANCH, 1003],
  ])(
    'keeps compiler error ID %i and its existing enum API',
    (code, expected) => {
      expect(createMpxCompilerError(code).code).toBe(expected)
    },
  )

  it.each([
    [
      'mpx-reserved-instance-data',
      'mpx',
      'reserved-instance-data',
      MpxDiagnosticCode.ReservedInstanceData,
    ],
    [
      'mpx-json-config',
      'mpx-json-schema',
      'config-value',
      MpxDiagnosticCode.JsonConfigValue,
    ],
    ['mpx-json-links', 'mpx-json', '4001', MpxDiagnosticCode.JsonPathNotFound],
    [
      'mpx-instance-fields',
      'mpx',
      5001,
      MpxDiagnosticCode.DuplicateInstanceField,
    ],
  ] as const)(
    'normalizes the audited %s provider without changing other diagnostic fields',
    async (name, source, code, expected) => {
      const original = diagnostic(source, code)
      const hover = vi.fn()
      const instance = {
        provideDiagnostics: vi.fn(() => [original]),
        provideHover: hover,
      }
      const plugin: LanguageServicePlugin = {
        name,
        capabilities: {
          diagnosticProvider: {
            interFileDependencies: false,
            workspaceDiagnostics: false,
          },
        },
        create: () => instance,
      }
      const wrapped = withNumericMpxDiagnosticCodes(plugin)
      expect(wrapped.capabilities).toBe(plugin.capabilities)
      const provider = wrapped.create(context)
      expect(provider.provideHover).toBe(hover)
      const result = await provider.provideDiagnostics!(document, token)
      expect(result).toEqual([{ ...original, code: expected }])
      expect(original.code).toBe(code)
      expect(instance.provideDiagnostics).toHaveBeenCalledWith(document, token)
    },
  )

  it('keeps provider receivers, cancellation, promises and upstream identities', async () => {
    const originals = [
      diagnostic('ts', 2339),
      diagnostic('json', 'config-value'),
      diagnostic('css', '4001'),
      diagnostic('mpx', 'future-rule'),
    ]
    const instance = {
      async provideDiagnostics(
        receivedDocument: TextDocument,
        receivedToken: typeof token,
      ) {
        expect(this).toBe(instance)
        expect(receivedDocument).toBe(document)
        expect(receivedToken).toBe(token)
        return originals
      },
    }
    const provider = withNumericMpxDiagnosticCodes({
      name: 'mpx-json-js',
      capabilities: {},
      create: () => instance,
    }).create(context)
    const result = await provider.provideDiagnostics!(document, token)
    expect(result).toEqual(originals)
    result!.forEach((item, index) => expect(item).toBe(originals[index]))
  })

  it('does not wrap upstream plugins or providers without diagnostics', () => {
    const upstream: LanguageServicePlugin = {
      name: 'typescript-semantic',
      capabilities: {},
      create: () => ({}),
    }
    expect(withNumericMpxDiagnosticCodes(upstream)).toBe(upstream)
    const instance = { provideHover: vi.fn() }
    expect(
      withNumericMpxDiagnosticCodes({
        name: 'mpx-links',
        capabilities: {},
        create: () => instance,
      }).create(context),
    ).toBe(instance)
  })

  it('preserves an absent result', async () => {
    const provider = withNumericMpxDiagnosticCodes({
      name: 'mpx-test',
      capabilities: {},
      create: () => ({ provideDiagnostics: () => undefined }),
    }).create(context)
    expect(await provider.provideDiagnostics!(document, token)).toBeUndefined()
  })

  it('keeps the JSON path code 4001 numeric at the exact mapped source range', async () => {
    const source = fs.readFileSync(
      path.join(fixtureRoot, 'missing-path.mpx'),
      'utf8',
    )
    const { diagnostics, document } = await diagnose(source, [
      createJsonLinks(),
    ])
    expect(diagnostics).toHaveLength(1)
    expect(diagnostics[0]).toMatchObject({
      source: 'mpx-json',
      code: MpxDiagnosticCode.JsonPathNotFound,
      severity: 1,
    })
    expect(document.getText(diagnostics[0].range)).toBe('./missing-panel.mpx')
  })

  it('preserves real upstream JSON-schema diagnostics including code, source and range', async () => {
    const source = fs.readFileSync(
      path.join(fixtureRoot, 'schema-control.mpx'),
      'utf8',
    )
    const before = await diagnose(source, [createJson()], false)
    const after = await diagnose(source, [createJson()])
    expect(before.diagnostics.length).toBeGreaterThan(0)
    expect(after.diagnostics).toEqual(before.diagnostics)
    expect(
      before.diagnostics.some(d =>
        before.document.getText(d.range).includes('wrong'),
      ),
    ).toBe(true)
  })

  it('preserves existing Mpx template diagnostics through source mapping', async () => {
    const source = fs.readFileSync(
      path.join(fixtureRoot, 'template-errors.mpx'),
      'utf8',
    )
    const before = await diagnose(source, [createTemplateErrors()], false)
    const after = await diagnose(source, [createTemplateErrors()])
    expect(before.diagnostics.map(d => d.code).sort()).toEqual([1001, 1002])
    expect(after.diagnostics).toEqual(before.diagnostics)
  })
})

async function diagnose(
  source: string,
  plugins: LanguageServicePlugin[],
  normalize = true,
) {
  const uri = URI.file(path.join(fixtureRoot, `test-${normalize}.mpx`))
  const language = createLanguage(
    [
      createMpxLanguagePlugin<URI>(
        ts,
        {},
        getDefaultCompilerOptions(),
        uri => uri.fsPath,
      ),
    ],
    createUriMap(),
    () => {},
  )
  language.scripts.set(uri, ts.ScriptSnapshot.fromString(source), 'mpx')
  const service = createLanguageService(
    language,
    normalize ? plugins.map(withNumericMpxDiagnosticCodes) : plugins,
    { workspaceFolders: [] },
    {},
  )
  try {
    const document = TextDocument.create(uri.toString(), 'mpx', 0, source)
    const diagnostics = await service.getDiagnostics(uri)
    // Compare public fields; Volar's bookkeeping contains the request URI.
    return {
      document,
      diagnostics: diagnostics.map(
        ({ data: _data, ...diagnostic }) => diagnostic,
      ),
    }
  } finally {
    service.dispose()
  }
}
