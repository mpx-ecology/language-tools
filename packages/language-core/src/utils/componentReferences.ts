import type * as ts from 'typescript'
import type { IScriptSnapshot, Language } from '@volar/language-core'
import { camelize, capitalize } from '@mpxjs/language-shared'
import { MpxVirtualCode } from '../virtualFile/mpxFile'
import { tsCodegen } from '../plugins/mpx-tsx'
import { createUsingComponentsPathResolver } from './formatUsingComponentsPath'

export interface ComponentReference {
  fileName: string
  textSpan: ts.TextSpan
}

interface Usage extends ComponentReference {
  targets: string[]
}

/** Project-local component identities. No workspace discovery or source-text search. */
export function createComponentReferenceIndex<T>(
  ts: typeof import('typescript'),
  language: Language<T>,
  asScriptId: (fileName: string) => T,
) {
  let previousProgram: ts.Program | undefined
  let references = new Map<string, ComponentReference[]>()
  let usages = new Map<string, Usage[]>()
  const syntax = new WeakMap<
    IScriptSnapshot,
    ReturnType<typeof collectSyntax>
  >()
  let identities = new Map<string, string>()

  function identity(fileName: string) {
    let key = identities.get(fileName)
    if (key === undefined) {
      // The resolver supplies absolute filenames. realpath also unifies package
      // symlinks / aliases when preserveSymlinks is enabled in the TS project.
      try {
        key = ts.sys.realpath?.(fileName) ?? fileName
      } catch {
        key = fileName
      }
      key = key.replace(/\\/g, '/')
      if (!ts.sys.useCaseSensitiveFileNames) key = key.toLowerCase()
      identities.set(fileName, key)
    }
    return key
  }

  function synchronize(program: ts.Program) {
    if (program === previousProgram) return
    references = new Map()
    usages = new Map()
    identities = new Map()
    const resolve = createUsingComponentsPathResolver(
      program.getCompilerOptions(),
    )
    for (const file of program.getSourceFiles()) {
      if (!file.fileName.endsWith('.mpx')) continue
      const source = language.scripts.get(asScriptId(file.fileName))
      const root = source?.generated?.root
      if (!source || !(root instanceof MpxVirtualCode)) continue
      let collected = syntax.get(source.snapshot)
      if (!collected) {
        collected = collectSyntax(root)
        syntax.set(source.snapshot, collected)
      }
      const registrations = new Map<string, string[]>()
      const local: Usage[] = []
      for (const { name, path, textSpan } of collected.paths) {
        const target = resolve(path, file.fileName)?.result
        if (!target || target.startsWith('plugin://')) continue
        const key = identity(target)
        const targets = registrations.get(name) ?? []
        if (!targets.includes(key)) targets.push(key)
        registrations.set(name, targets)
        local.push({ fileName: file.fileName, textSpan, targets: [key] })
      }
      const normalized = new Map<string, string[] | undefined>()
      for (const [name, targets] of registrations) {
        const canonical = canonicalName(name)
        normalized.set(
          canonical,
          normalized.has(canonical) ? undefined : targets,
        )
      }
      for (const { name, textSpan } of collected.tags) {
        // Prefer the exact local registration. A spelling fallback must never
        // join unrelated components whose normalized registration names collide.
        const targets =
          registrations.get(name) ?? normalized.get(canonicalName(name))
        if (targets?.length)
          local.push({ fileName: file.fileName, textSpan, targets })
      }
      usages.set(identity(file.fileName), local)
      for (const usage of local) {
        for (const target of usage.targets) {
          const entries = references.get(target) ?? []
          entries.push(usage)
          references.set(target, entries)
        }
      }
    }
    for (const [target, entries] of references)
      references.set(target, dedupe(entries))
    previousProgram = program
  }

  return {
    getFileReferences(program: ts.Program, fileName: string) {
      synchronize(program)
      return references.get(identity(fileName)) ?? []
    },
    getReferencesAtPosition(
      program: ts.Program,
      fileName: string,
      offset: number,
    ) {
      const source = language.scripts.get(asScriptId(fileName))
      const root = source?.generated?.root
      if (!source || !(root instanceof MpxVirtualCode)) return
      let collected = syntax.get(source.snapshot)
      if (!collected) {
        collected = collectSyntax(root)
        syntax.set(source.snapshot, collected)
      }
      // Script symbols / template expressions keep their native TS behavior and
      // must not initialize the project index just to discover they are unrelated.
      if (
        ![...collected.paths, ...collected.tags].some(
          ({ textSpan }) =>
            offset >= textSpan.start &&
            offset <= textSpan.start + textSpan.length,
        )
      )
        return
      synchronize(program)
      const matches = usages
        .get(identity(fileName))
        ?.filter(
          ({ textSpan }) =>
            offset >= textSpan.start &&
            offset <= textSpan.start + textSpan.length,
        )
      if (!matches?.length) return
      return dedupe(
        matches.flatMap(usage =>
          usage.targets.flatMap(target => references.get(target) ?? []),
        ),
      )
    },
  }

  function dedupe(entries: ComponentReference[]) {
    const unique = new Map<string, ComponentReference>()
    for (const entry of entries) {
      const key = `${identity(entry.fileName)}:${entry.textSpan.start}:${entry.textSpan.length}`
      if (!unique.has(key)) unique.set(key, entry)
    }
    return [...unique.values()]
  }

  function collectSyntax(root: MpxVirtualCode) {
    const paths: { name: string; path: string; textSpan: ts.TextSpan }[] = []
    const tags: { name: string; textSpan: ts.TextSpan }[] = []
    const { json, template } = root.sfc
    if (json) {
      const scanner = ts.createScanner(ts.ScriptTarget.Latest, true)
      scanner.setText(json.content)
      for (const [name, candidates] of json.usingComponents ?? []) {
        for (const candidate of candidates) {
          scanner.setTextPos(candidate.offset)
          const token = scanner.scan()
          const quoted = token === ts.SyntaxKind.StringLiteral
          const start = candidate.offset + (quoted ? 1 : 0)
          const length = quoted
            ? scanner.getTokenEnd() - candidate.offset - 2
            : candidate.text.length
          paths.push({
            name,
            path: candidate.text,
            textSpan: { start: json.startTagEnd + start, length },
          })
        }
      }
    }
    if (template) {
      for (const tag of tsCodegen.get(root.sfc)?.getGeneratedTemplate()
        ?.templateNodeTags ?? []) {
        for (const offset of [tag.startTagOffset, tag.endTagOffset]) {
          if (offset !== undefined)
            tags.push({
              name: tag.name,
              textSpan: {
                start: template.startTagEnd + offset,
                length: tag.name.length,
              },
            })
        }
      }
    }
    return { paths, tags }
  }
}

function canonicalName(name: string) {
  return capitalize(camelize(name))
}
