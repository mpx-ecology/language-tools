import path from 'node:path'
import fs from 'node:fs'
import * as ts from 'typescript'
import { URI } from 'vscode-uri'
import { expect, it } from 'vitest'
import { MpxVirtualCode, createParsedCommandLine } from '@mpxjs/language-core'
import { createHybridMpxLanguage } from '../src/hybridMpxLanguage'

it('loads unopened application dependencies, respects buffers, and refreshes tracked disk changes', () => {
  const root = path.resolve(
    __dirname,
    '../../language-core/__tests__/fixtures/registered-components',
  )
  const parsed = createParsedCommandLine(
    ts,
    ts.sys,
    path.join(root, 'tsconfig.json'),
    true,
  )
  const page = URI.file(path.join(root, 'app-a/pages/index.mpx'))
  const app = URI.file(path.join(root, 'app-a/app.mpx'))
  const pageSnapshot = ts.ScriptSnapshot.fromString(
    fs.readFileSync(page.fsPath, 'utf8'),
  )
  let appSnapshot: ts.IScriptSnapshot | undefined
  let diskContent = fs.readFileSync(app.fsPath, 'utf8')
  let reads = 0
  const { language, syncFileChange } = createHybridMpxLanguage(
    ts,
    parsed.options,
    parsed.mpxOptions,
    uri =>
      uri.toString() === page.toString()
        ? { languageId: 'mpx', getSnapshot: () => pageSnapshot }
        : uri.toString() === app.toString() && appSnapshot
          ? { languageId: 'mpx', getSnapshot: () => appSnapshot! }
          : undefined,
    file => {
      reads++
      return file === app.fsPath ? diskContent : ts.sys.readFile(file)
    },
  )
  const tags = () => {
    const code = language.scripts.get(page)!.generated!.root
    expect(code).toBeInstanceOf(MpxVirtualCode)
    return [...(code as MpxVirtualCode).sfc.usingComponents!.keys()]
  }
  expect(tags()).toContain('app-panel')
  appSnapshot = ts.ScriptSnapshot.fromString(
    diskContent.replace('app-panel', 'buffer-panel'),
  )
  language.scripts.get(app)
  expect(tags()).toContain('buffer-panel')
  diskContent = diskContent.replace('app-panel', 'disk-panel')
  syncFileChange(app)
  expect(tags()).toContain('buffer-panel')
  appSnapshot = undefined
  language.scripts.get(app)
  expect(tags()).toContain('disk-panel')
  diskContent = diskContent.replace('disk-panel', 'updated-panel')
  syncFileChange(app)
  expect(tags()).toContain('updated-panel')
  const before = reads
  syncFileChange(URI.file(path.join(root, 'unrelated.mpx')))
  expect(reads).toBe(before)
})
