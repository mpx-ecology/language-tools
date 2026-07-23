import type { ComponentPropInfo } from '../../typescript-plugin/src/requests'
import type { IRequests } from '../../typescript-plugin/src/requests'
import type * as vscode from 'vscode-languageserver-protocol'
import { TextDocument } from 'vscode-languageserver-textdocument'
import { beforeEach, describe, expect, it, vi } from 'vitest'

interface TestAttributeData {
  name: string
  description?: string | { kind: string; value: string }
  values?: { name: string }[]
}

interface TestDataProvider {
  provideAttributes(tag: string): TestAttributeData[]
}

interface TestHtmlServiceOptions {
  getCustomData(): TestDataProvider[]
}

const mockState = vi.hoisted(() => ({
  htmlOptions: undefined as TestHtmlServiceOptions | undefined,
  completionCalls: [] as string[],
  completionWaiters: new Map<string, Promise<void>>(),
  hoverCalls: [] as string[],
  hoverWaiters: new Map<string, Promise<void>>(),
}))

vi.mock('volar-service-html', () => ({
  create(options: TestHtmlServiceOptions) {
    mockState.htmlOptions = options
    return {
      capabilities: {
        completionProvider: {},
      },
      create() {
        return {
          async provideCompletionItems(document: TextDocument) {
            mockState.completionCalls.push(document.uri)
            await mockState.completionWaiters.get(document.uri)
            const tag = getTagForUri(document.uri)
            const provider = mockState.htmlOptions!.getCustomData()[0]
            return {
              isIncomplete: false,
              items: provider
                .provideAttributes(tag)
                .map(attribute => ({ label: attribute.name })),
            }
          },
          async provideHover(document: TextDocument) {
            mockState.hoverCalls.push(document.uri)
            await mockState.hoverWaiters.get(document.uri)
            const tag = getTagForUri(document.uri)
            const provider = mockState.htmlOptions!.getCustomData()[0]
            return {
              contents: {
                kind: 'markdown',
                value: provider.provideAttributes(tag)[0]?.name ?? 'none',
              },
            }
          },
        }
      },
    }
  },
}))

vi.mock('../src/utils/templateCodegenHelper', () => ({
  templateCodegenHelper(_context: unknown, uri: string) {
    const tag = getTagForUri(uri)
    const candidateCount = uri.includes('single') ? 1 : 2
    return {
      documentUri: {
        fsPath: uri,
      },
      sfc: {
        json: {
          // Two paths also exercise the HTML hover path used for component
          // candidates instead of the native TypeScript hover.
          usingComponents: new Map([
            [
              tag,
              Array.from({ length: candidateCount }, (_, index) => ({
                text: `${tag}-${index + 1}`,
              })),
            ],
          ]),
        },
      },
    }
  },
}))

import { create } from '../src/plugins/mpx-sfc-template'

const documentA = TextDocument.create(
  'file:///a.mpx.__template.html',
  'html',
  0,
  '<foo-a prop-a>',
)
const documentB = TextDocument.create(
  'file:///b.mpx.__template.html',
  'html',
  0,
  '<foo-b prop-b>',
)
const singleCandidateDocument = TextDocument.create(
  'file:///single.mpx.__template.html',
  'html',
  0,
  '<foo-single prop>',
)
const tagEditingDocument = TextDocument.create(
  'file:///a.mpx.__tag-editing.html',
  'html',
  0,
  '<foo-a',
)
const completionPosition = {
  line: 0,
  character: 7,
}
const hoverPosition = {
  line: 0,
  character: 10,
}
const singleCandidateHoverPosition = {
  line: 0,
  character: 14,
}
const tagEditingPosition = {
  line: 0,
  character: 6,
}
const completionContext: vscode.CompletionContext = {
  triggerKind: 1,
}
const neverCancelledToken: vscode.CancellationToken = {
  isCancellationRequested: false,
  onCancellationRequested: () => ({
    dispose() {},
  }),
}

describe('template custom data request concurrency', () => {
  beforeEach(() => {
    mockState.htmlOptions = undefined
    mockState.completionCalls = []
    mockState.completionWaiters = new Map()
    mockState.hoverCalls = []
    mockState.hoverWaiters = new Map()
  })

  it('aborts a stale request before it calls HTML completion', async () => {
    const propsA = deferred<ComponentPropInfo[]>()
    const client = createTsClient((_, tag) =>
      tag === 'foo-a'
        ? propsA.promise
        : Promise.resolve([{ name: 'fromB', type: 'string' }]),
    )
    const service = createService(client)

    const requestA = service.provideCompletionItems!(
      documentA,
      completionPosition,
      completionContext,
      neverCancelledToken,
    )
    await vi.waitFor(() =>
      expect(client.getComponentProps).toHaveBeenCalledWith(
        documentA.uri,
        'foo-a',
      ),
    )

    const resultB = await service.provideCompletionItems!(
      documentB,
      completionPosition,
      completionContext,
      neverCancelledToken,
    )
    propsA.resolve([{ name: 'fromA', type: 'string' }])
    const resultA = await requestA

    expect(resultA).toBeUndefined()
    expect(resultB?.items.map(item => item.label)).toEqual(['fromB'])
    expect(mockState.completionCalls).toEqual([documentB.uri])
  })

  it('discards a request superseded while HTML completion is running', async () => {
    const htmlA = deferred<void>()
    mockState.completionWaiters.set(documentA.uri, htmlA.promise)
    const client = createTsClient((_, tag) =>
      Promise.resolve([
        {
          name: tag === 'foo-a' ? 'fromA' : 'fromB',
          type: 'string',
        },
      ]),
    )
    const service = createService(client)

    const requestA = service.provideCompletionItems!(
      documentA,
      completionPosition,
      completionContext,
      neverCancelledToken,
    )
    await vi.waitFor(() =>
      expect(mockState.completionCalls).toContain(documentA.uri),
    )

    const resultB = await service.provideCompletionItems!(
      documentB,
      completionPosition,
      completionContext,
      neverCancelledToken,
    )
    htmlA.resolve()
    const resultA = await requestA

    expect(resultA).toBeUndefined()
    expect(resultB?.items.map(item => item.label)).toEqual(['fromB'])
  })

  it('discards a hover superseded while the HTML service is running', async () => {
    const htmlA = deferred<void>()
    mockState.hoverWaiters.set(documentA.uri, htmlA.promise)
    const client = createTsClient((_, tag) =>
      Promise.resolve([
        {
          name: tag === 'foo-a' ? 'prop-a' : 'prop-b',
          type: 'string',
        },
      ]),
    )
    const service = createService(client)

    const requestA = service.provideHover!(
      documentA,
      hoverPosition,
      neverCancelledToken,
    )
    await vi.waitFor(() =>
      expect(mockState.hoverCalls).toContain(documentA.uri),
    )

    const resultB = await service.provideHover!(
      documentB,
      hoverPosition,
      neverCancelledToken,
    )
    htmlA.resolve()
    const resultA = await requestA

    expect(resultA).toBeUndefined()
    expect(resultB).toMatchObject({
      contents: {
        value: 'prop-b',
      },
    })
  })

  it('does not continue after cancellation', async () => {
    const propsA = deferred<ComponentPropInfo[]>()
    const client = createTsClient(() => propsA.promise)
    const service = createService(client)
    let cancelled = false
    const token = {
      get isCancellationRequested() {
        return cancelled
      },
    } as vscode.CancellationToken

    const request = service.provideCompletionItems!(
      documentA,
      completionPosition,
      completionContext,
      token,
    )
    await vi.waitFor(() =>
      expect(client.getComponentProps).toHaveBeenCalledOnce(),
    )
    cancelled = true
    propsA.resolve([{ name: 'fromA', type: 'string' }])

    await expect(request).resolves.toBeUndefined()
    expect(mockState.completionCalls).toEqual([])
  })

  it('maps prop metadata to HTML custom data and excludes native attributes', async () => {
    const client = createTsClient(() =>
      Promise.resolve([
        {
          name: 'theme',
          type: '"light" | "dark" | undefined',
          deprecated: true,
          commentMarkdown: '组件显示主题。',
          values: ['light', 'dark'],
        },
        {
          name: 'aria-label',
          type: 'string',
          isAttribute: true,
        },
      ]),
    )
    const service = createService(client)

    const result = await service.provideCompletionItems!(
      documentA,
      completionPosition,
      completionContext,
      neverCancelledToken,
    )
    const attributes = mockState
      .htmlOptions!.getCustomData()[0]
      .provideAttributes('foo-a')

    expect(result?.items.map(item => item.label)).toEqual(['theme'])
    expect(attributes).toEqual([
      {
        name: 'theme',
        description: {
          kind: 'markdown',
          value:
            '`theme?: "light" | "dark" | undefined`\n\n' +
            '**@deprecated**\n\n' +
            '组件显示主题。',
        },
        values: [{ name: 'light' }, { name: 'dark' }],
      },
    ])
  })

  it('uses native TypeScript hover for a single component candidate', async () => {
    const client = createTsClient(() =>
      Promise.resolve([{ name: 'prop', type: 'string' }]),
    )
    const service = createService(client)

    await service.provideHover!(
      singleCandidateDocument,
      singleCandidateHoverPosition,
      neverCancelledToken,
    )

    expect(client.getComponentProps).not.toHaveBeenCalled()
  })

  it('does not request component Props while editing a tag name', async () => {
    const client = createTsClient(() =>
      Promise.resolve([{ name: 'prop', type: 'string' }]),
    )
    const service = createService(client)

    await service.provideCompletionItems!(
      tagEditingDocument,
      tagEditingPosition,
      completionContext,
      neverCancelledToken,
    )

    expect(client.getComponentProps).not.toHaveBeenCalled()
  })
})

function createService(client: IRequests) {
  const plugin = create(() => client)
  const service = plugin.create!({
    project: {
      mpx: {},
    },
  } as never)
  if (!service) {
    throw new Error('Unable to create Mpx template language service')
  }
  return service
}

function createTsClient(
  getComponentProps: (
    fileName: string,
    tag: string,
  ) => Promise<ComponentPropInfo[]>,
) {
  return {
    getComponentProps: vi.fn(getComponentProps),
  } as unknown as IRequests & {
    getComponentProps: ReturnType<typeof vi.fn<typeof getComponentProps>>
  }
}

function deferred<T>() {
  let resolve!: (value: T | PromiseLike<T>) => void
  const promise = new Promise<T>(resolvePromise => {
    resolve = resolvePromise
  })
  return {
    promise,
    resolve,
  }
}

function getTagForUri(uri: string) {
  if (uri.includes('single')) {
    return 'foo-single'
  }
  return uri.includes('/a.mpx') ? 'foo-a' : 'foo-b'
}
