import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { BaseLanguageClient } from '@volar/vscode'
import * as vscode from 'vscode'
import { activate } from '../src/features/componentNavigationDecorations'

const state = vi.hoisted(() => {
  function event() {
    const callbacks = new Set<(value: unknown) => void>()
    return {
      listen(callback: (value: unknown) => void) {
        callbacks.add(callback)
        return { dispose: () => callbacks.delete(callback) }
      },
      fire(value?: unknown) {
        for (const callback of callbacks) callback(value)
      },
      clear() {
        callbacks.clear()
      },
    }
  }
  return {
    visible: [] as {
      document: {
        uri: { toString(): string }
        version: number
        languageId: string
      }
      setDecorations: ReturnType<typeof vi.fn>
    }[],
    running: true,
    links: true,
    events: {
      visible: event(),
      active: event(),
      text: event(),
      config: event(),
      create: event(),
      delete: event(),
      file: event(),
      status: event(),
    },
    decoration: { dispose: vi.fn() },
    watcherDispose: vi.fn(),
  }
})
vi.mock('@volar/vscode', () => ({ State: { Running: 2, Stopped: 1 } }))
vi.mock('vscode', () => ({
  Range: class {
    start: { line: number; character: number }
    end: { line: number; character: number }
    constructor(a: number, b: number, c: number, d: number) {
      this.start = { line: a, character: b }
      this.end = { line: c, character: d }
    }
  },
  Disposable: class {
    constructor(private callback: () => void) {}
    dispose() {
      this.callback()
    }
  },
  DecorationRangeBehavior: { ClosedClosed: 1 },
  languages: {
    match: (_selector: unknown, document: { languageId: string }) =>
      document.languageId === 'mpx' ? 1 : 0,
  },
  window: {
    get visibleTextEditors() {
      return state.visible
    },
    createTextEditorDecorationType: vi.fn(() => state.decoration),
    onDidChangeVisibleTextEditors: state.events.visible.listen,
    onDidChangeActiveTextEditor: state.events.active.listen,
  },
  workspace: {
    getConfiguration: () => ({ get: () => state.links }),
    onDidChangeTextDocument: state.events.text.listen,
    onDidChangeConfiguration: state.events.config.listen,
    createFileSystemWatcher: () => ({
      dispose: state.watcherDispose,
      onDidCreate: state.events.create.listen,
      onDidDelete: state.events.delete.listen,
      onDidChange: state.events.file.listen,
    }),
  },
}))

const range = {
  start: { line: 2, character: 8 },
  end: { line: 2, character: 15 },
}
let subscriptions: { dispose(): unknown }[]
beforeEach(() => {
  vi.useFakeTimers()
  state.visible = []
  state.running = true
  state.links = true
  for (const event of Object.values(state.events)) event.clear()
  subscriptions = []
})
afterEach(() => {
  for (const item of subscriptions) item.dispose()
  vi.useRealTimers()
})
function editor(uri = 'file:///index.mpx', languageId = 'mpx') {
  const value = {
    document: { uri: { toString: () => uri }, version: 1, languageId },
    setDecorations: vi.fn(),
  }
  state.visible.push(value)
  return value
}
function start(
  sendRequest = vi.fn().mockResolvedValue({ version: 1, ranges: [range] }),
) {
  activate({ subscriptions } as unknown as vscode.ExtensionContext, ['mpx'], {
    isRunning: () => state.running,
    sendRequest,
    onDidChangeState: state.events.status.listen,
  } as unknown as BaseLanguageClient)
  return sendRequest
}

describe('component navigation underlines', () => {
  it('paints passive underlines once per document in split editors', async () => {
    const first = editor()
    const second = { document: first.document, setDecorations: vi.fn() }
    state.visible.push(second)
    const request = start()
    await vi.advanceTimersByTimeAsync(100)
    expect(vscode.window.createTextEditorDecorationType).toHaveBeenCalledWith({
      textDecoration: 'underline; text-underline-position: under;',
      rangeBehavior: 1,
    })
    expect(request).toHaveBeenCalledTimes(1)
    expect(request.mock.calls[0]![1]).toEqual({
      textDocument: { uri: 'file:///index.mpx', version: 1 },
    })
    for (const item of [first, second])
      expect(item.setDecorations).toHaveBeenLastCalledWith(state.decoration, [
        expect.objectContaining(range),
      ])
  })
  it('ignores stale responses after source edits and applies the current version', async () => {
    const item = editor()
    let resolve!: (value: unknown) => void
    const request = vi
      .fn()
      .mockReturnValueOnce(
        new Promise(value => {
          resolve = value
        }),
      )
      .mockResolvedValue({ version: 2, ranges: [range] })
    start(request)
    await vi.advanceTimersByTimeAsync(100)
    item.document.version = 2
    state.events.text.fire({ document: item.document })
    resolve({ version: 1, ranges: [range] })
    await Promise.resolve()
    expect(item.setDecorations).not.toHaveBeenCalled()
    await vi.advanceTimersByTimeAsync(100)
    expect(request.mock.calls[1]![1]).toEqual({
      textDocument: { uri: 'file:///index.mpx', version: 2 },
    })
    expect(item.setDecorations).toHaveBeenLastCalledWith(state.decoration, [
      expect.objectContaining(range),
    ])
  })
  it('refreshes on external file changes and removes obsolete ranges', async () => {
    const item = editor()
    const request = start()
    await vi.advanceTimersByTimeAsync(100)
    request.mockResolvedValue({ version: 1, ranges: [] })
    state.events.create.fire()
    state.events.file.fire()
    state.events.delete.fire()
    await vi.advanceTimersByTimeAsync(100)
    expect(request).toHaveBeenCalledTimes(2)
    expect(item.setDecorations).toHaveBeenLastCalledWith(state.decoration, [])
  })
  it('clears old underlines when the server has a different source version or a request fails', async () => {
    const item = editor()
    const request = start()
    await vi.advanceTimersByTimeAsync(100)
    request.mockResolvedValueOnce({ version: 0, ranges: [range] })
    state.events.file.fire()
    await vi.advanceTimersByTimeAsync(100)
    expect(item.setDecorations).toHaveBeenLastCalledWith(state.decoration, [])
    request.mockRejectedValueOnce(new Error('server stopped'))
    state.events.file.fire()
    await vi.advanceTimersByTimeAsync(100)
    expect(item.setDecorations).toHaveBeenLastCalledWith(state.decoration, [])
  })
  it('clears on server stop and requests again after restart', async () => {
    const item = editor()
    const request = start()
    await vi.advanceTimersByTimeAsync(100)
    state.running = false
    state.events.status.fire({ newState: 1 })
    expect(item.setDecorations).toHaveBeenLastCalledWith(state.decoration, [])
    state.running = true
    state.events.status.fire({ newState: 2 })
    await vi.advanceTimersByTimeAsync(100)
    expect(request).toHaveBeenCalledTimes(2)
    expect(item.setDecorations).toHaveBeenLastCalledWith(state.decoration, [
      expect.objectContaining(range),
    ])
  })
  it('respects editor.links and excludes other document languages', async () => {
    const item = editor()
    const other = editor('file:///plain.txt', 'plaintext')
    const request = start()
    await vi.advanceTimersByTimeAsync(100)
    expect(request).toHaveBeenCalledTimes(1)
    expect(other.setDecorations).toHaveBeenLastCalledWith(state.decoration, [])
    state.links = false
    state.events.config.fire({
      affectsConfiguration: (section: string) => section === 'editor.links',
    })
    await vi.advanceTimersByTimeAsync(100)
    expect(request).toHaveBeenCalledTimes(1)
    expect(item.setDecorations).toHaveBeenLastCalledWith(state.decoration, [])
  })
  it('does not apply responses after disposal', async () => {
    const item = editor()
    let resolve!: (value: unknown) => void
    start(
      vi.fn().mockReturnValue(
        new Promise(value => {
          resolve = value
        }),
      ),
    )
    await vi.advanceTimersByTimeAsync(100)
    for (const subscription of subscriptions) subscription.dispose()
    resolve({ version: 1, ranges: [range] })
    await Promise.resolve()
    expect(item.setDecorations).not.toHaveBeenCalled()
    expect(state.decoration.dispose).toHaveBeenCalled()
    expect(state.watcherDispose).toHaveBeenCalled()
  })
})
