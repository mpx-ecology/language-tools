import type { LanguageServer } from '@volar/language-server'
import * as ts from 'typescript'
import { URI } from 'vscode-uri'
import { createConnection, createServer } from '@volar/language-server/node'
import { createLanguageServiceEnvironment } from '@volar/language-server/lib/project/simpleProject'
import {
  createLanguage,
  createMpxLanguagePlugin,
  createParsedCommandLine,
  getDefaultCompilerOptions,
} from '@mpxjs/language-core'
import {
  LanguageService,
  createLanguageService,
  createMpxLanguageServicePlugins,
  createUriMap,
} from '@mpxjs/language-service'

const connection = createConnection()
const server = createServer(connection)

const tsserverRequestHandlers = new Map<number, (response: any) => void>()
let tsserverRequestId = 0

connection.listen()

connection.onNotification('tsserver/response', ([id, response]) => {
  tsserverRequestHandlers.get(id)?.(response)
  tsserverRequestHandlers.delete(id)
})

connection.onInitialize(params => {
  const tsconfigProjects = createUriMap<LanguageService>()
  const file2ProjectInfo = new Map<
    string,
    Promise<ts.server.protocol.ProjectInfo | null>
  >()

  server.fileWatcher.onDidChangeWatchedFiles(({ changes }) => {
    for (const change of changes) {
      const changeUri = URI.parse(change.uri)
      if (tsconfigProjects.has(changeUri)) {
        tsconfigProjects.get(changeUri)!.dispose()
        tsconfigProjects.delete(changeUri)
        file2ProjectInfo.clear()
      }
    }
  })

  let simpleLs: LanguageService | undefined

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
              ls = createLs(server, configFileName)
              tsconfigProjects.set(URI.file(configFileName), ls)
            }
            return ls
          }
        }
        return (simpleLs ??= createLs(server, undefined))
      },
      getExistingLanguageServices() {
        return Promise.all(
          [...tsconfigProjects.values(), simpleLs].filter(promise => !!promise),
        )
      },
      reload() {
        for (const ls of [...tsconfigProjects.values(), simpleLs]) {
          ls?.dispose()
        }
        tsconfigProjects.clear()
        simpleLs = undefined
      },
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

  function createLs(server: LanguageServer, tsconfig: string | undefined) {
    const commonLine = tsconfig
      ? createParsedCommandLine(ts, ts.sys, tsconfig)
      : {
          options: ts.getDefaultCompilerOptions(),
          mpxOptions: getDefaultCompilerOptions(),
        }
    const language = createLanguage<URI>(
      [
        {
          getLanguageId: uri => server.documents.get(uri)?.languageId,
        },
        createMpxLanguagePlugin(
          ts,
          commonLine.options,
          commonLine.mpxOptions,
          (uri: { fsPath: string }) => uri.fsPath.replace(/\\/g, '/'),
        ),
      ],
      createUriMap(),
      uri => {
        const document = server.documents.get(uri)
        if (document) {
          language.scripts.set(uri, document.getSnapshot(), document.languageId)
        } else {
          language.scripts.delete(uri)
        }
      },
    )
    return createLanguageService(
      language,
      server.languageServicePlugins,
      createLanguageServiceEnvironment(server, [
        ...server.workspaceFolders.all,
      ]),
      { mpx: { compilerOptions: commonLine.mpxOptions } },
    )
  }
})

connection.onInitialized(server.initialized)

connection.onShutdown(server.shutdown)
