import type { InitializeParams } from '@volar/language-server'
import * as ts from 'typescript'
import { URI } from 'vscode-uri'
import {
  createConnection,
  createServer,
  createTypeScriptProject,
} from '@volar/language-server/node'
import { createLanguageServiceEnvironment } from '@volar/language-server/lib/project/simpleProject'
import {
  createMpxLanguageServicePlugins,
  createTypeScriptSemanticPlugin,
  createUriMap,
} from '@mpxjs/language-service'
import {
  type TypeScriptProjectLS,
  createTypeScriptLS,
} from '@volar/language-server/lib/project/typescriptProjectLs'
import {
  createUriConverter,
  getWorkspaceFolder,
} from '@volar/language-server/lib/project/typescriptProject'
import { createMpxProject } from './mpxProject'
import { ComponentNavigationRangesRequest } from './protocol'
import { getComponentNavigationRangeResponse } from './componentNavigation'

const connection = createConnection()
const server = createServer(connection)

let closedDocumentVersion = 0
server.documents.onDidClose(() => closedDocumentVersion++)
const documentState = {
  isOpen: (uri: URI) => !!server.documents.get(uri),
  getClosedVersion: () => closedDocumentVersion,
}

const tsserverRequestHandlers = new Map<number, (response: any) => void>()
let tsserverRequestId = 0

connection.listen()

connection.onNotification('tsserver/response', ([id, response]) => {
  tsserverRequestHandlers.get(id)?.(response)
  tsserverRequestHandlers.delete(id)
})

connection.onRequest(ComponentNavigationRangesRequest, (params, token) =>
  getComponentNavigationRangeResponse(server, params, token),
)

connection.onInitialize(params => {
  if (params.initializationOptions?.agent) {
    return initializeForAgent(params)
  }
  return initializeForIDE(params)
})

/**
 * Agent mode: standalone TypeScript project, no tsserver dependency.
 * Activated via initializationOptions.agent = true.
 */
function initializeForAgent(params: InitializeParams) {
  const plugins = createMpxLanguageServicePlugins(ts, undefined, {
    componentDefinitionProvider: true,
  })
  plugins.push(createTypeScriptSemanticPlugin(ts))

  return server.initialize(
    params,
    createTypeScriptProject(ts, undefined, context =>
      createMpxProject(ts, context, false, documentState),
    ),
    plugins,
  )
}

/**
 * IDE mode: delegates TypeScript semantics to IDE's tsserver via notifications.
 */
function initializeForIDE(params: InitializeParams) {
  const tsconfigProjects = createUriMap<Promise<TypeScriptProjectLS>>()
  const configDependencies =
    createUriMap<ReturnType<typeof createUriMap<boolean>>>()
  const file2ProjectInfo = new Map<
    string,
    Promise<ts.server.protocol.ProjectInfo | null>
  >()

  // Root config discovery and package resolution can affect project ownership
  // or imports globally. Other config reads are tracked per project; ordinary
  // imported JSON files use Volar's watched-file cache updates in place.
  server.fileWatcher.onDidChangeWatchedFiles(({ changes }) => {
    const globalChange = changes.some(change =>
      /\/(?:tsconfig|jsconfig|package)\.json$/.test(URI.parse(change.uri).path),
    )
    let configChanged = globalChange
    if (globalChange) {
      disposeProjects()
    } else {
      for (const [config, dependencies] of configDependencies) {
        if (changes.some(change => dependencies.has(URI.parse(change.uri)))) {
          configChanged = true
          const project = tsconfigProjects.get(config)
          tsconfigProjects.delete(config)
          configDependencies.delete(config)
          void project?.then(project => project.dispose())
        }
      }
      if (configChanged) file2ProjectInfo.clear()
    }
    server.languageFeatures.requestRefresh(configChanged)
  })

  let simpleLs: Promise<TypeScriptProjectLS> | undefined

  function disposeProjects() {
    for (const project of [...tsconfigProjects.values(), simpleLs]) {
      void project?.then(project => project.dispose())
    }
    tsconfigProjects.clear()
    configDependencies.clear()
    file2ProjectInfo.clear()
    simpleLs = undefined
  }

  return server.initialize(
    params,
    {
      setup() {},
      async getLanguageService(uri) {
        if (uri.scheme === 'file') {
          const fileName = uri.fsPath.replace(/\\/g, '/')
          let projectInfoPromise = file2ProjectInfo.get(fileName)
          if (!projectInfoPromise) {
            projectInfoPromise = sendTsRequest<ts.server.protocol.ProjectInfo>(
              `_mpx:${ts.server.protocol.CommandTypes.ProjectInfo}`,
              {
                file: fileName,
                needFileNameList: false,
              } satisfies ts.server.protocol.ProjectInfoRequestArgs,
            )
            file2ProjectInfo.set(fileName, projectInfoPromise)
          }
          const projectInfo = await projectInfoPromise
          if (projectInfo) {
            const { configFileName } = projectInfo || {}
            let ls = tsconfigProjects.get(URI.file(configFileName))
            if (!ls) {
              ls = createLs(configFileName)
              tsconfigProjects.set(URI.file(configFileName), ls)
            }
            const project = await ls
            project.tryAddFile(fileName)
            return project.languageService
          }
        }
        const project = await (simpleLs ??= createLs(undefined))
        if (uri.scheme === 'file')
          project.tryAddFile(uri.fsPath.replace(/\\/g, '/'))
        return project.languageService
      },
      async getExistingLanguageServices() {
        const projects = await Promise.all(
          [...tsconfigProjects.values(), simpleLs].filter(project => !!project),
        )
        return projects.map(project => project!.languageService)
      },
      reload: disposeProjects,
    },
    createMpxLanguageServicePlugins(ts, {
      collectExtractProps(...args: any[]) {
        return sendTsRequest('_mpx:collectExtractProps', args)
      },
      getComponentDirectives(...args: any[]) {
        return sendTsRequest('_mpx:getComponentDirectives', args)
      },
      getComponentEvents(...args: any[]) {
        return sendTsRequest('_mpx:getComponentEvents', args)
      },
      getComponentNames(...args: any[]) {
        return sendTsRequest('_mpx:getComponentNames', args)
      },
      getComponentProps(...args: any[]) {
        return sendTsRequest('_mpx:getComponentProps', args)
      },
      getElementAttrs(...args: any[]) {
        return sendTsRequest('_mpx:getElementAttrs', args)
      },
      getElementNames(...args: any[]) {
        return sendTsRequest('_mpx:getElementNames', args)
      },
      getImportPathForFile(...args: any[]) {
        return sendTsRequest('_mpx:getImportPathForFile', args)
      },
      getCompletion(...args: any[]) {
        return sendTsRequest('_mpx:getCompletion', args)
      },
      getPropertiesAtLocation(...args: any[]) {
        return sendTsRequest('_mpx:getPropertiesAtLocation', args)
      },
      getDocumentHighlights(fileName: string, position: any) {
        return sendTsRequest(
          '_mpx:documentHighlights-full', // ts internal command
          {
            file: fileName,
            ...({ position } as unknown as {
              line: number
              offset: number
            }),
            filesToSearch: [fileName],
          } satisfies ts.server.protocol.DocumentHighlightsRequestArgs,
        )
      },
      async getQuickInfoAtPosition(fileName: any, { line, character }: any) {
        const result = await sendTsRequest<ts.QuickInfo>(
          `_mpx:${ts.server.protocol.CommandTypes.Quickinfo}`,
          {
            file: fileName,
            line: line + 1,
            offset: character + 1,
          } satisfies ts.server.protocol.FileLocationRequestArgs,
        )
        return ts.displayPartsToString(result?.displayParts ?? [])
      },
    }),
  )

  /**
   * Send request to client
   */
  async function sendTsRequest<T>(
    command: string,
    args: any,
  ): Promise<T | null> {
    return await new Promise<T | null>(resolve => {
      const requestId = ++tsserverRequestId
      tsserverRequestHandlers.set(requestId, resolve)
      connection.sendNotification('tsserver/request', [
        requestId,
        command,
        args,
      ])
    })
  }

  function createLs(tsconfig: string | undefined) {
    const dependencies = createUriMap<boolean>()
    if (tsconfig) {
      dependencies.set(URI.file(tsconfig), true)
      configDependencies.set(URI.file(tsconfig), dependencies)
    }
    const workspaceFolder = getWorkspaceFolder(
      tsconfig
        ? URI.file(tsconfig)
        : ([...server.workspaceFolders.all][0] ??
            URI.file(ts.sys.getCurrentDirectory())),
      server.workspaceFolders,
    )
    return createTypeScriptLS(
      ts,
      undefined,
      tsconfig ?? { allowJs: true, noEmit: true },
      server,
      createLanguageServiceEnvironment(server, [
        ...server.workspaceFolders.all,
      ]),
      workspaceFolder,
      createUriConverter([...server.workspaceFolders.all]),
      context =>
        createMpxProject(ts, context, true, documentState, fileName =>
          dependencies.set(URI.file(fileName), true),
        ),
    )
  }
}

connection.onInitialized(() => {
  server.initialized()
  // Volar's FS/TypeScript caches consume these events, but merely subscribing
  // does not register a watcher with the editor. Include config/package JSON
  // and all native TS/JS extensions used by the JSON semantic project.
  void server.fileWatcher.watchFiles([
    '**/*.{mpx,js,jsx,cjs,mjs,ts,tsx,cts,mts,json}',
  ])
})

connection.onShutdown(server.shutdown)
