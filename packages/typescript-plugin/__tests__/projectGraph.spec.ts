import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { expect, it, vi } from 'vitest'
import { createProjectGraphScope } from '../src/utils/projectGraph'

it('reuses realpaths during a graph update, then observes a retargeted symlink', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'mpx-graph-realpaths-'))
  const first = path.join(root, 'first.mpx')
  const second = path.join(root, 'second.mpx')
  const alias = path.join(root, 'alias.mpx')
  fs.writeFileSync(first, '')
  fs.writeFileSync(second, '')
  fs.symlinkSync(first, alias)
  const original = vi.fn((fileName: string) => fs.realpathSync(fileName))
  const host = { realpath: original }
  const run = createProjectGraphScope(host)
  try {
    const target = fs.realpathSync(first)
    run(() => {
      expect(host.realpath(alias)).toBe(target)
      run(() => expect(host.realpath(alias)).toBe(target))
      expect(host.realpath(alias)).toBe(target)
    })
    expect(original).toHaveBeenCalledTimes(1)
    fs.unlinkSync(alias)
    fs.symlinkSync(second, alias)
    const updated = fs.realpathSync(second)
    expect(host.realpath(alias)).toBe(updated)
    expect(original).toHaveBeenCalledTimes(2)
    run(() => expect(host.realpath(alias)).toBe(updated))
    expect(original).toHaveBeenCalledTimes(3)
    expect(() =>
      run(() => {
        throw new Error('graph failed')
      }),
    ).toThrow('graph failed')
    expect(host.realpath(alias)).toBe(updated)
    expect(original).toHaveBeenCalledTimes(4)
  } finally {
    fs.rmSync(root, { recursive: true, force: true })
  }
})

it('supports a host without realpath', () => {
  expect(createProjectGraphScope({})(() => 42)).toBe(42)
})

it('reuses file contents and missing reads only during the current graph', () => {
  const files = new Map([['package.json', '{"main":"first.mpx"}']])
  const original = vi.fn((name: string) => files.get(name))
  const host = { readFile: original }
  const run = createProjectGraphScope(host)
  run(() => {
    for (let i = 0; i < 10; i++) {
      expect(host.readFile('package.json')).toBe('{"main":"first.mpx"}')
      expect(host.readFile('missing.json')).toBeUndefined()
    }
  })
  expect(original).toHaveBeenCalledTimes(2)
  files.set('package.json', '{"main":"second.mpx"}')
  files.set('missing.json', '{}')
  run(() => {
    expect(host.readFile('package.json')).toBe('{"main":"second.mpx"}')
    expect(host.readFile('missing.json')).toBe('{}')
  })
  expect(original).toHaveBeenCalledTimes(4)
  files.delete('package.json')
  expect(host.readFile('package.json')).toBeUndefined()
})
