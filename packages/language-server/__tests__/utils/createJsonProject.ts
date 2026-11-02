import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import type { LanguageServer } from '@volar/language-server'
import type {
  DidChangeWatchedFilesParams,
  LanguageServiceEnvironment,
} from '@mpxjs/language-service'
import {
  createMpxLanguageServicePlugins,
  createUriMap,
} from '@mpxjs/language-service'
import { create as createSemantic } from 'volar-service-typescript/lib/plugins/semantic'
import { createTypeScriptLS } from '@volar/language-server/lib/project/typescriptProjectLs'
import { createUriConverter } from '@volar/language-server/lib/project/typescriptProject'
import * as ts from 'typescript'
import { URI } from 'vscode-uri'
import { SnapshotDocument } from '@volar/language-server/lib/utils/snapshotDocument'
import { createMpxProject } from '../../src/mpxProject'

// Mpx's ambient process declaration only exposes env. Use the actual Node API
// for the temporary directories in this server integration harness.
const nodeProcess: NodeJS.Process = require('node:process')

function event<T>() {
  const callbacks = new Set<(value: T) => unknown>()
  return {
    subscribe(callback: (value: T) => unknown) {
      callbacks.add(callback)
      return { dispose: () => callbacks.delete(callback) }
    },
    async emit(value: T) {
      await Promise.all([...callbacks].map(callback => callback(value)))
    },
    get size() {
      return callbacks.size
    },
  }
}

export async function createJsonProject(
  jsonOnly = true,
  options: Record<string, unknown> = {},
  configured = true,
) {
  const originalCwd = nodeProcess.cwd()
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'mpx-json-service-'))
  fs.cpSync(path.resolve(__dirname, '../fixtures/json-semantics'), root, {
    recursive: true,
  })
  const configFile = path.join(root, 'tsconfig.json')
  const config = JSON.parse(fs.readFileSync(configFile, 'utf8'))
  Object.assign(config.compilerOptions, options)
  fs.writeFileSync(configFile, JSON.stringify(config))
  type Document = SnapshotDocument
  const documents = createUriMap<Document>()
  let closedVersion = 0
  const open = event<{ document: Document }>()
  const close = event<{ document: Document }>()
  const change = event<{ document: Document }>()
  const save = event<{ document: Document }>()
  const watched = event<DidChangeWatchedFilesParams>()
  const tsClient = {
    getDocumentHighlights: async () => null,
    getCompletion: async () => undefined,
  } as unknown as NonNullable<
    Parameters<typeof createMpxLanguageServicePlugins>[1]
  >
  const plugins = createMpxLanguageServicePlugins(
    ts,
    jsonOnly ? tsClient : undefined,
    { componentDefinitionProvider: true },
  )
  if (!jsonOnly) plugins.push(createSemantic(ts))
  const server = {
    documents: {
      get: (uri: URI) => documents.get(uri),
      all: () => [...documents.values()],
      onDidOpen: open.subscribe,
      onDidClose: close.subscribe,
      onDidChangeContent: change.subscribe,
      onDidSave: save.subscribe,
    },
    languageServicePlugins: plugins,
  } as unknown as LanguageServer
  const env: LanguageServiceEnvironment = {
    workspaceFolders: [URI.file(root)],
    onDidChangeWatchedFiles: watched.subscribe,
    fs: {
      stat(uri) {
        try {
          const stat = fs.statSync(uri.fsPath)
          return {
            type: stat.isDirectory() ? 2 : 1,
            ctime: stat.ctimeMs,
            mtime: stat.mtimeMs,
            size: stat.size,
          }
        } catch {
          return undefined
        }
      },
      readFile: uri => ts.sys.readFile(uri.fsPath),
      readDirectory(uri) {
        try {
          return fs
            .readdirSync(uri.fsPath, { withFileTypes: true })
            .map(entry => [entry.name, entry.isDirectory() ? 2 : 1])
        } catch {
          return []
        }
      },
    },
  }
  const project = await createTypeScriptLS(
    ts,
    undefined,
    configured ? configFile : { allowJs: true, noEmit: true },
    server,
    env,
    URI.file(root),
    createUriConverter([URI.file(root)]),
    context =>
      createMpxProject(ts, context, jsonOnly, {
        isOpen: uri => documents.has(uri),
        getClosedVersion: () => closedVersion,
      }),
  )
  const service = project.languageService
  return {
    root,
    jsonOnly,
    project,
    service,
    uri: (name: string) => URI.file(path.join(root, name)),
    read: (name: string) => fs.readFileSync(path.join(root, name), 'utf8'),
    async edit(name: string, text: string) {
      const uri = URI.file(path.join(root, name))
      const existed = documents.get(uri)
      let document = existed
      if (document) {
        const old = document.getText()
        let start = 0
        while (
          start < old.length &&
          start < text.length &&
          old[start] === text[start]
        )
          start++
        let oldEnd = old.length
        let newEnd = text.length
        while (
          oldEnd > start &&
          newEnd > start &&
          old[oldEnd - 1] === text[newEnd - 1]
        ) {
          oldEnd--
          newEnd--
        }
        document.update(
          [
            {
              range: {
                start: document.positionAt(start),
                end: document.positionAt(oldEnd),
              },
              text: text.slice(start, newEnd),
            },
          ],
          document.version + 1,
        )
      } else {
        document = new SnapshotDocument(
          uri.toString(),
          name.endsWith('.mpx') ? 'mpx' : 'javascript',
          1,
          text,
        )
      }
      documents.set(uri, document)
      if (!existed) await open.emit({ document })
      await change.emit({ document })
      project.tryAddFile(uri.fsPath)
    },
    async close(name: string) {
      const uri = URI.file(path.join(root, name))
      const document = documents.get(uri)!
      documents.delete(uri)
      closedVersion++
      await close.emit({ document })
    },
    async write(name: string, text: string | undefined) {
      const file = path.join(root, name)
      const existed = fs.existsSync(file)
      if (text === undefined) fs.rmSync(file)
      else fs.writeFileSync(file, text)
      await watched.emit({
        changes: [
          {
            uri: URI.file(file).toString(),
            type: text === undefined ? 3 : existed ? 2 : 1,
          },
        ],
      })
    },
    dispose() {
      project.dispose()
      const documentListeners = open.size + close.size + change.size + save.size
      const fileListeners = watched.size
      nodeProcess.chdir(originalCwd)
      fs.rmSync(root, { recursive: true, force: true })
      return { documentListeners, fileListeners }
    },
  }
}
