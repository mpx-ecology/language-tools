import type * as ts from 'typescript'
import type { IRequests } from '@mpxjs/typescript-plugin/src/requests'
import type {
  LanguageServiceContext,
  LanguageServicePlugin,
} from '@volar/language-service'
import type * as vscode from 'vscode-languageserver-protocol'
import * as path from 'node:path'
import * as fs from 'node:fs'
import { createUsingComponentsPathResolver } from '@mpxjs/language-core'
import * as html from 'vscode-html-languageservice'
import { TextDocument } from 'vscode-languageserver-textdocument'
import { URI, Utils } from 'vscode-uri'
import templateBuiltinData from '../data/template'
import { templateCodegenHelper } from '../utils/templateCodegenHelper'
import {
  createRegistrationEdit,
  readComponentConfig,
} from '../utils/componentRegistration'

interface Candidate {
  tag: string
  uri: URI
  keepExtension: boolean
}
interface CompletionData {
  kind: 'mpx-component-registration'
  uri: string
  version: number
  candidate: string
  tag: string
  range: vscode.Range
}
const builtinTags = new Set([
  ...(templateBuiltinData.tags ?? []).map(tag => tag.name),
  'component',
  'template',
  'slot',
  'block',
  'import',
  'include',
])
const ignoredDirectories = new Set([
  'node_modules',
  '.git',
  '.pnpm',
  'out',
  'dist',
  'coverage',
  '.next',
])
const platformSuffix =
  /\.(?:wx|ali|swan|qq|tt|jd|dd|web|ios|android|harmony|qa)\.mpx$/i
const scannerService = html.getLanguageService({
  useDefaultDataProvider: false,
})

export function create(
  ts: typeof import('typescript'),
  getTsClient: (context: LanguageServiceContext) => IRequests | undefined,
): LanguageServicePlugin {
  return {
    name: 'mpx-component-registration',
    capabilities: {
      completionProvider: { resolveProvider: true, triggerCharacters: ['<'] },
      codeActionProvider: {
        codeActionKinds: ['quickfix'],
        resolveProvider: true,
      },
    },
    create(context) {
      // Cache directory discovery, not document contents. Open snapshots always
      // win over disk; watched file changes also invalidate in-flight scans.
      const fileLists = new Map<
        string,
        { time: number; files: Promise<URI[]> }
      >()
      const parsed = new Map<
        string,
        { text: string; config: ReturnType<typeof readComponentConfig> }
      >()
      const completionDocuments = new Map<string, TextDocument>()
      let generation = 0
      const invalidate = () => {
        generation++
        fileLists.clear()
        parsed.clear()
        completionDocuments.clear()
      }
      const watchers = [
        context.env.onDidChangeWatchedFiles?.(({ changes }) => {
          if (
            changes.some(change =>
              /\.(?:mpx|json)$/i.test(URI.parse(change.uri).path),
            )
          )
            invalidate()
        }),
        context.env.onDidChangeConfiguration?.(invalidate),
      ]
      const configOf = (text: string, uri: URI) => {
        const cached = parsed.get(uri.toString())
        if (cached?.text === text) return cached.config
        const config = readComponentConfig(ts, text)
        parsed.set(uri.toString(), { text, config })
        return config
      }
      async function read(uri: URI) {
        const script = context.language.scripts.get(uri)
        return script
          ? script.snapshot.getText(0, script.snapshot.getLength())
          : await context.env.fs?.readFile(uri)
      }
      function sourceDocument(uri: URI) {
        const script = context.language.scripts.get(uri)
        return (
          script &&
          context.documents.get(uri, script.languageId, script.snapshot)
        )
      }
      const options = () =>
        context.project.mpx?.typescriptCompilerOptions ??
        context.project.typescript?.languageServiceHost.getCompilationSettings() ??
        {}

      async function available(
        source: TextDocument,
        token: vscode.CancellationToken,
      ) {
        const revision = generation
        const uri = URI.parse(source.uri)
        const workspace = context.env.workspaceFolders
          .filter(folder => contains(folder, uri))
          .sort((a, b) => b.path.length - a.path.length)[0]
        if (!workspace || uri.scheme !== 'file') return
        let scope = workspace
        let globals = new Map<string, string>()
        let globalReason: string | undefined
        // Stop at the nearest app boundary; never execute app JSON-JS either.
        for (
          let folder = Utils.dirname(uri);
          contains(workspace, folder);
          folder = Utils.dirname(folder)
        ) {
          const app = Utils.joinPath(folder, 'app.mpx')
          const text = await read(app)
          if (text !== undefined) {
            const config = configOf(text, app)
            if (config.reason)
              globalReason = '应用配置无法静态解析，请确认全局注册后手动注册'
            globals = config.registrations
            scope = folder
            break
          }
          if (folder.path === workspace.path) break
        }
        const config = configOf(source.getText(), uri)
        const registered = new Set([
          ...config.registrations.keys(),
          ...globals.keys(),
        ])
        const compilerOptions = options()
        const resolvePath = createUsingComponentsPathResolver(compilerOptions)
        const registeredPaths = new Set([
          ...[...config.registrations.values()].flatMap(value =>
            identities(value, uri, compilerOptions, resolvePath),
          ),
          ...[...globals.values()].flatMap(value =>
            identities(
              value,
              Utils.joinPath(scope, 'app.mpx'),
              compilerOptions,
              resolvePath,
            ),
          ),
        ])
        let cached = fileLists.get(scope.toString())
        if (!cached || Date.now() - cached.time > 5000) {
          cached = { time: Date.now(), files: discover(scope) }
          fileLists.set(scope.toString(), cached)
        }
        const files = await cached.files
        const filePaths = new Set(files.map(file => file.path))
        const candidates: Candidate[] = []
        for (const file of files) {
          if (token.isCancellationRequested) return
          if (
            file.toString() === source.uri ||
            registeredPaths.has(identity(file))
          )
            continue
          const name = path.posix.basename(file.path, '.mpx')
          const tag = (
            name === 'index'
              ? path.posix.basename(Utils.dirname(file).path)
              : name
          )
            .replace(/([a-z\d])([A-Z])/g, '$1-$2')
            .toLowerCase()
          if (
            !/^[a-z][a-z\d]*(?:-[a-z\d]+)*$/.test(tag) ||
            registered.has(tag) ||
            builtinTags.has(tag)
          )
            continue
          const text = await read(file)
          if (text === undefined) continue
          const component = configOf(text, file)
          if (component.isComponent && !component.reason)
            candidates.push({
              tag,
              uri: file,
              keepExtension: filePaths.has(
                file.path.replace(/\.mpx$/, '/index.mpx'),
              ),
            })
        }
        if (candidates.length) {
          const names = await getTsClient(context)?.getComponentNames(
            uri.fsPath,
          )
          if (names?.length) {
            const known = new Set(
              names.flatMap(name => [
                name,
                name.replace(/([a-z\d])([A-Z])/g, '$1-$2').toLowerCase(),
              ]),
            )
            for (let index = candidates.length - 1; index >= 0; index--) {
              if (known.has(candidates[index].tag)) candidates.splice(index, 1)
            }
          }
        }
        if (revision !== generation || token.isCancellationRequested) return
        return { candidates, reason: globalReason ?? config.reason }
      }
      async function discover(root: URI) {
        const files: URI[] = []
        async function walk(folder: URI) {
          let entries: [string, number][]
          try {
            entries = (await context.env.fs?.readDirectory(folder)) ?? []
          } catch {
            return
          }
          if (
            folder.path !== root.path &&
            entries.some(([name]) => name === 'app.mpx')
          )
            return
          for (const [name, type] of entries.sort(([a], [b]) =>
            a.localeCompare(b),
          )) {
            const uri = Utils.joinPath(folder, name)
            if (
              type === 2 &&
              !ignoredDirectories.has(name) &&
              !name.startsWith('.')
            )
              await walk(uri)
            else if (
              type === 1 &&
              name.endsWith('.mpx') &&
              !platformSuffix.test(name)
            )
              files.push(uri)
          }
        }
        await walk(root)
        return files
      }
      function registrationPath(candidate: Candidate, document: TextDocument) {
        const uri = URI.parse(document.uri)
        const registrations = configOf(document.getText(), uri).registrations
        const samples = [...registrations.values()]
        let value = path.posix.relative(
          Utils.dirname(uri).path,
          candidate.uri.path,
        )
        if (!value.startsWith('.')) value = './' + value
        // Reuse an existing tsconfig alias only when its target is unambiguous.
        const compilerOptions = options()
        for (const [alias, targets] of Object.entries(
          compilerOptions.paths ?? {},
        )) {
          if (
            targets.length !== 1 ||
            !alias.endsWith('*') ||
            !targets[0].endsWith('*')
          )
            continue
          const prefix = alias.slice(0, -1)
          if (!samples.some(sample => sample.startsWith(prefix))) continue
          const base =
            compilerOptions.baseUrl ??
            (compilerOptions as { pathsBasePath?: string }).pathsBasePath
          if (!base) continue
          const target =
            URI.file(path.resolve(base, targets[0].slice(0, -1))).path.replace(
              /\/$/,
              '',
            ) + '/'
          if (candidate.uri.path.startsWith(target)) {
            value = prefix + candidate.uri.path.slice(target.length)
            break
          }
        }
        if (
          !candidate.keepExtension &&
          samples.length &&
          samples.every(sample => !sample.split('?')[0].endsWith('.mpx'))
        )
          value = value.replace(/\.mpx$/, '')
        return value
      }
      async function resolveRegistration(
        data: Omit<CompletionData, 'range'>,
        token: vscode.CancellationToken,
        completion?: CompletionData,
      ) {
        const original =
          completion && completionDocuments.get(`${data.uri}:${data.version}`)
        const source = original ?? sourceDocument(URI.parse(data.uri))
        const changed = () => {
          const current = sourceDocument(URI.parse(data.uri))
          if (!source || !current || token.isCancellationRequested) return true
          if (current.version === data.version) return false
          // VS Code can insert the primary tag before asynchronous additional
          // edits finish resolving. Permit exactly that insertion; unrelated
          // changes still invalidate the registration and its original ranges.
          if (original && completion) {
            return (
              current.getText() !==
              TextDocument.applyEdits(original, [
                { range: completion.range, newText: data.tag },
              ])
            )
          }
          return true
        }
        if (changed())
          return {
            edits: [],
            reason: '文档已更改，请重新触发组件补全或 Quick Fix',
          }
        const result = await available(source!, token)
        const candidate = result?.candidates.find(
          candidate =>
            candidate.uri.toString() === data.candidate &&
            candidate.tag === data.tag,
        )
        if (changed())
          return {
            edits: [],
            reason: '文档已更改，请重新触发组件补全或 Quick Fix',
          }
        if (!candidate || result?.reason)
          return {
            edits: [],
            reason:
              result?.reason ?? '组件候选已失效，请重新触发补全或 Quick Fix',
          }
        return createRegistrationEdit(
          ts,
          source!,
          data.tag,
          registrationPath(candidate, source!),
        )
      }
      return {
        dispose() {
          watchers.forEach(watcher => watcher?.dispose())
          invalidate()
        },
        async provideCompletionItems(
          document,
          position,
          _completionContext,
          token,
        ) {
          if (document.languageId !== 'html') return
          const helper = templateCodegenHelper(context, document.uri)
          const tag = tagAt(document, position)
          if (!helper || !tag) return
          const source = sourceDocument(helper.documentUri)
          if (!source) return
          const result = await available(source, token)
          if (!result || result.reason || token.isCancellationRequested) return
          completionDocuments.set(`${source.uri}:${source.version}`, source)
          if (completionDocuments.size > 32)
            completionDocuments.delete(completionDocuments.keys().next().value!)
          return {
            // Requery after accepting or undoing a registration, even if the
            // editor reuses its current completion session.
            isIncomplete: true,
            items: result.candidates.map(candidate => ({
              label: candidate.tag,
              kind: 7,
              labelDetails: {
                description: registrationPath(candidate, source),
              },
              detail: '自动注册 usingComponents',
              documentation: `接受后将 ${registrationPath(candidate, source)} 写入 usingComponents。`,
              textEdit: { range: tag.range, newText: candidate.tag },
              data: {
                kind: 'mpx-component-registration',
                uri: source.uri,
                version: source.version,
                tag: candidate.tag,
                candidate: candidate.uri.toString(),
                range: {
                  start: source.positionAt(
                    helper.sfc.template!.startTagEnd +
                      document.offsetAt(tag.range.start),
                  ),
                  end: source.positionAt(
                    helper.sfc.template!.startTagEnd +
                      document.offsetAt(tag.range.end),
                  ),
                },
              } satisfies CompletionData,
            })),
          }
        },
        async resolveCompletionItem(item, token) {
          const data = item.data as CompletionData
          item.textEdit = { range: data.range, newText: data.tag }
          const registration = await resolveRegistration(data, token, data)
          item.additionalTextEdits = registration.edits.length
            ? registration.edits
            : undefined
          if (registration.reason) item.detail = registration.reason
          return item
        },
        // resolve produces original SFC ranges, including edits outside the
        // template mapping. Do not map them through the HTML document again.
        transformCompletionItem: item => item,
        async provideCodeActions(document, range, codeActionContext, token) {
          if (
            document.languageId !== 'html' ||
            codeActionContext.only?.every(kind => !'quickfix'.startsWith(kind))
          )
            return
          const helper = templateCodegenHelper(context, document.uri)
          const tag = tagAt(document, range.start)
          if (!helper || !tag?.name) return
          const source = sourceDocument(helper.documentUri)
          if (!source) return
          const result = await available(source, token)
          return result?.candidates
            .filter(candidate => candidate.tag === tag.name)
            .map(candidate => {
              return {
                title: `注册 ${candidate.tag}：${registrationPath(candidate, source)}`,
                kind: 'quickfix',
                data: {
                  kind: 'mpx-component-registration',
                  uri: source.uri,
                  version: source.version,
                  tag: candidate.tag,
                  candidate: candidate.uri.toString(),
                } satisfies Omit<CompletionData, 'range'>,
                ...(result.reason
                  ? { disabled: { reason: result.reason } }
                  : {}),
              }
            })
        },
        async resolveCodeAction(action, token) {
          const registration = await resolveRegistration(action.data, token)
          if (registration.reason)
            action.disabled = { reason: registration.reason }
          else action.edit = registration.edit
          return action
        },
        transformCodeAction: action => action,
      }
    },
  }
}

function contains(folder: URI, uri: URI) {
  return (
    folder.scheme === uri.scheme &&
    folder.authority === uri.authority &&
    (folder.path === uri.path ||
      uri.path.startsWith(folder.path.replace(/\/$/, '') + '/'))
  )
}
function identity(uri: URI) {
  // Preserve distinct files such as card.mpx and card/index.mpx. Resolve only
  // actual filesystem aliases; unsaved snapshots retain their exact URI.
  try {
    return URI.file(fs.realpathSync(uri.fsPath)).toString()
  } catch {
    return uri.toString()
  }
}
function identities(
  value: string,
  from: URI,
  options: ts.CompilerOptions,
  resolve: ReturnType<typeof createUsingComponentsPathResolver>,
) {
  const resolved = resolve(value, from.fsPath)?.candidates
  if (resolved?.length)
    return resolved
      .filter(candidate => !candidate.realFilename.startsWith('plugin://'))
      .map(candidate => identity(URI.file(candidate.realFilename)))
  // An open document may not exist on disk yet. Preserve exact literal/alias
  // identities without guessing that a filename and directory index are equal.
  value = value.split('?')[0]
  if (value.startsWith('.'))
    return [identity(Utils.resolvePath(Utils.dirname(from), value))]
  for (const [alias, targets] of Object.entries(options.paths ?? {})) {
    const prefix = alias.endsWith('*') ? alias.slice(0, -1) : alias
    if (alias.endsWith('*') ? value.startsWith(prefix) : value === alias) {
      const base =
        options.baseUrl ?? (options as { pathsBasePath?: string }).pathsBasePath
      if (base)
        return targets.map(target =>
          identity(
            URI.file(
              path.resolve(
                base,
                target.replace('*', value.slice(prefix.length)),
              ),
            ),
          ),
        )
    }
  }
  return []
}
function tagAt(document: TextDocument, position: vscode.Position) {
  const offset = document.offsetAt(position)
  const scanner = scannerService.createScanner(document.getText())
  for (
    let token = scanner.scan();
    token !== html.TokenType.EOS;
    token = scanner.scan()
  ) {
    if (scanner.getTokenOffset() > offset) break
    if (token === html.TokenType.StartTag && offset <= scanner.getTokenEnd()) {
      return {
        name: scanner.getTokenText(),
        range: {
          start: document.positionAt(scanner.getTokenOffset()),
          end: document.positionAt(scanner.getTokenEnd()),
        },
      }
    }
    if (
      token === html.TokenType.StartTagOpen &&
      offset === scanner.getTokenEnd()
    ) {
      return { name: '', range: { start: position, end: position } }
    }
  }
}
