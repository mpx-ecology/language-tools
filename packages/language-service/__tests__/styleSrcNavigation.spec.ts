import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import {
  FileType,
  createLanguage,
  createLanguageService,
  createUriMap,
} from '@volar/language-service'
import {
  createMpxLanguagePlugin,
  getDefaultCompilerOptions,
} from '@mpxjs/language-core'
import * as ts from 'typescript'
import { TextDocument } from 'vscode-languageserver-textdocument'
import { URI } from 'vscode-uri'
import { afterEach, expect, it } from 'vitest'
import { create } from '../src/plugins/mpx-sfc'

let cleanup: (() => void) | undefined
afterEach(() => cleanup?.())

function setup(source: string) {
  const root = fs.realpathSync(
    fs.mkdtempSync(path.join(os.tmpdir(), 'mpx-style-src-')),
  )
  const uri = URI.file(path.join(root, 'src/app.mpx'))
  const language = createLanguage(
    [
      createMpxLanguagePlugin<URI>(
        ts,
        {},
        getDefaultCompilerOptions(),
        id => id.fsPath,
      ),
    ],
    createUriMap(),
    () => {},
  )
  const service = createLanguageService(
    language,
    [create()],
    {
      workspaceFolders: [URI.file(root)],
      fs: {
        stat(target) {
          const stats = fs.statSync(target.fsPath, { throwIfNoEntry: false })
          if (stats)
            return {
              type: stats.isFile() ? FileType.File : FileType.Directory,
              ctime: stats.ctimeMs,
              mtime: stats.mtimeMs,
              size: stats.size,
            }
        },
        readDirectory: () => [],
        readFile: target => ts.sys.readFile(target.fsPath),
      },
    },
    {},
  )
  cleanup = () => {
    service.dispose()
    fs.rmSync(root, { recursive: true, force: true })
  }

  let snapshot = ts.ScriptSnapshot.fromString(source)
  let document = TextDocument.create(uri.toString(), 'mpx', 0, source)
  language.scripts.set(uri, snapshot, 'mpx')
  return {
    get document() {
      return document
    },
    write(name: string, content = '') {
      const fileName = path.join(root, name)
      fs.mkdirSync(path.dirname(fileName), { recursive: true })
      fs.writeFileSync(fileName, content)
      return URI.file(fileName).toString()
    },
    links: () => service.getDocumentLinks(uri),
    definitions: (offset: number) =>
      service.getDefinition(uri, document.positionAt(offset)),
    insert(at: number, text: string) {
      const old = snapshot
      source = source.slice(0, at) + text + source.slice(at)
      snapshot = ts.ScriptSnapshot.fromString(source)
      snapshot.getChangeRange = previous =>
        previous === old
          ? ts.createTextChangeRange(ts.createTextSpan(at, 0), text.length)
          : undefined
      language.scripts.set(uri, snapshot, 'mpx')
      document = TextDocument.create(
        uri.toString(),
        'mpx',
        document.version + 1,
        source,
      )
    },
  }
}

it('links each top-level style src to a local or installed package file', async () => {
  const source = [
    '<style mode="ios" src="./theme.ios.css" />',
    '<style mode="android" src=\'./theme.ios.css\' />',
    '<style mode="wx" lang="stylus"',
    '  src="@example/theme/src/common.css"></style>',
    '<style src="../a &amp; b.css"></style>',
    '<style src=./unquoted.css></style>',
    '<style src="./missing.css" />',
    '<style src="@example/missing/theme.css" />',
    '<style src="./folder" />',
    '<style src />',
    '<style src="" />',
    '<script src="./entry.ts" lang="ts"></script>',
    '<!-- <style src="./theme.ios.css" /> -->',
    '<template><view src="./theme.ios.css" /></template>',
  ].join('\r\n')
  const fixture = setup(source)
  const local = fixture.write('src/theme.ios.css')
  const pkg = fixture.write('node_modules/@example/theme/src/common.css')
  const escaped = fixture.write('a & b.css')
  const unquoted = fixture.write('src/unquoted.css')
  fixture.write('src/folder/item.css')
  fixture.write('src/entry.ts', 'export default {}')

  const links = await fixture.links()
  expect(
    links.map(link => [
      link.range.start.line,
      fixture.document.getText(link.range),
      link.target,
    ]),
  ).toEqual([
    [0, './theme.ios.css', local],
    [1, './theme.ios.css', local],
    [3, '@example/theme/src/common.css', pkg],
    [4, '../a &amp; b.css', escaped],
    [5, './unquoted.css', unquoted],
  ])

  for (const link of links) {
    const definitions = await fixture.definitions(
      fixture.document.offsetAt(link.range.start) + 2,
    )
    expect(
      definitions?.map(definition => [
        definition.originSelectionRange,
        definition.targetUri,
      ]),
    ).toEqual([[link.range, link.target]])
  }
  for (const text of [
    'mode="ios"',
    './missing.css',
    './folder',
    './entry.ts',
  ]) {
    expect(await fixture.definitions(source.indexOf(text) + 2)).toEqual([])
  }
})

it('keeps ranges current when source before a style block changes', async () => {
  const source =
    '<script>export default {}</script>\n<style src="./theme.css" />'
  const fixture = setup(source)
  const target = fixture.write('src/theme.css')
  expect(await fixture.links()).toHaveLength(1)
  fixture.insert(source.indexOf('export'), '// comment\n')

  const [link] = await fixture.links()
  expect(link.target).toBe(target)
  expect(link.range.start.line).toBe(2)
  expect(fixture.document.getText(link.range)).toBe('./theme.css')
  expect(
    await fixture.definitions(fixture.document.offsetAt(link.range.start) + 2),
  ).toMatchObject([{ targetUri: target }])
})
