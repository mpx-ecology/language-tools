import type * as ts from 'typescript'
import {
  type MpxCompilerOptions,
  createLanguage,
  createMpxLanguagePlugin,
} from '@mpxjs/language-core'
import { createUriMap } from '@mpxjs/language-service'
import { URI } from 'vscode-uri'

/** The IDE service needs unopened Mpx sources for application registrations. */
export function createHybridMpxLanguage(
  ts: typeof import('typescript'),
  compilerOptions: ts.CompilerOptions,
  mpxOptions: MpxCompilerOptions,
  getDocument: (
    uri: URI,
  ) => { languageId: string; getSnapshot(): ts.IScriptSnapshot } | undefined,
  readFile = ts.sys.readFile,
) {
  const snapshots = new Map<string, ts.IScriptSnapshot | undefined>()
  const language = createLanguage<URI>(
    [
      { getLanguageId: uri => getDocument(uri)?.languageId },
      createMpxLanguagePlugin(
        ts,
        compilerOptions,
        mpxOptions,
        uri => uri.fsPath.replace(/\\/g, '/'),
        URI.file,
      ),
    ],
    createUriMap(),
    (uri, includeFsFiles) => {
      const document = getDocument(uri)
      if (document) {
        language.scripts.set(uri, document.getSnapshot(), document.languageId)
      } else if (
        includeFsFiles &&
        uri.scheme === 'file' &&
        mpxOptions.extensions.some(ext => uri.path.endsWith(ext))
      ) {
        const key = uri.toString()
        const content = readFile(uri.fsPath)
        let snapshot = snapshots.get(key)
        if (content === undefined) {
          snapshots.set(key, undefined)
          language.scripts.delete(uri)
        } else {
          if (
            !snapshot ||
            snapshot.getText(0, snapshot.getLength()) !== content
          ) {
            snapshot = ts.ScriptSnapshot.fromString(content)
            snapshots.set(key, snapshot)
          }
          language.scripts.set(uri, snapshot, 'mpx')
        }
      } else {
        language.scripts.delete(uri)
      }
    },
  )
  return {
    language,
    syncFileChange(uri: URI) {
      // Only reload dependencies already requested by this project.
      if (snapshots.has(uri.toString())) language.scripts.get(uri)
    },
  }
}
