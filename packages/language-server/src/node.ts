import type * as ts from 'typescript'
import type { LanguageServer } from '@volar/language-server'
import type { MpxInitializationOptions } from './types'

import { URI } from 'vscode-uri'
import {
  createConnection,
  createServer,
  loadTsdkByPath,
} from '@volar/language-server/node'
import { createLanguageServiceEnvironment } from '@volar/language-server/lib/project/simpleProject'
import {
  createLanguage,
  createParsedCommandLine,
  createMpxLanguagePlugin,
  getDefaultCompilerOptions,
} from '@mpxjs/language-core'
import {
  createLanguageService,
  createUriMap,
  getHybridModeLanguageServicePlugins,
  LanguageService,
} from '@mpxjs/language-service'

const connection = createConnection()
const server = createServer(connection)

connection.listen()

connection.onInitialize(params => {
  const options: MpxInitializationOptions = params.initializationOptions

  if (!options.typescript?.tsdk) {
    throw new Error('typescript.tsdk is required')
  }
  if (!options.typescript?.tsserverRequestCommand) {
    connection.console.warn(
      'typescript.tsserverRequestCommand is required for complete TS features',
    )
  }

  const { typescript: ts } = loadTsdkByPath(
    options.typescript.tsdk,
    params.locale,
  )
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
        if (
          uri.scheme === 'file' &&
          options.typescript.tsserverRequestCommand
        ) {
          const fileName = uri.fsPath.replace(/\\/g, '/')
          let projectInfoPromise = file2ProjectInfo.get(fileName)
          if (!projectInfoPromise) {
            projectInfoPromise = sendTsRequest<ts.server.protocol.ProjectInfo>(
              ts.server.protocol.CommandTypes.ProjectInfo,
              {
                file: fileName,
                needFileNameList: false,
              } satisfies ts.server.protocol.ProjectInfoRequestArgs,
            )
            file2ProjectInfo.set(fileName, projectInfoPromise)
          }
          const projectInfo = await projectInfoPromise
          if (projectInfo) {
            const { configFileName } = projectInfo
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
    getHybridModeLanguageServicePlugins(
      ts,
      options.typescript.tsserverRequestCommand
        ? {
            collectExtractProps(...args: any[]) {
              return sendTsRequest('mpx:collectExtractProps', args)
            },
            getComponentDirectives(...args: any[]) {
              return sendTsRequest('mpx:getComponentDirectives', args)
            },
            getComponentEvents(...args: any[]) {
              return sendTsRequest('mpx:getComponentEvents', args)
            },
            getComponentNames(...args: any[]) {
              return sendTsRequest('mpx:getComponentNames', args)
            },
            getComponentProps(...args: any[]) {
              return sendTsRequest('mpx:getComponentProps', args)
            },
            getElementAttrs(...args: any[]) {
              return sendTsRequest('mpx:getElementAttrs', args)
            },
            getElementNames(...args: any[]) {
              return sendTsRequest('mpx:getElementNames', args)
            },
            getImportPathForFile(...args: any[]) {
              return sendTsRequest('mpx:getImportPathForFile', args)
            },
            getPropertiesAtLocation(...args: any[]) {
              return sendTsRequest('mpx:getPropertiesAtLocation', args)
            },
            getDocumentHighlights(fileName: string, position: any) {
              return sendTsRequest(
                'documentHighlights-full', // internal command
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
            async getQuickInfoAtPosition(
              fileName: any,
              { line, character }: any,
            ) {
              const result = await sendTsRequest<ts.QuickInfo>(
                ts.server.protocol.CommandTypes.Quickinfo,
                {
                  file: fileName,
                  line: line + 1,
                  offset: character + 1,
                } satisfies ts.server.protocol.FileLocationRequestArgs,
              )
              return ts.displayPartsToString(result?.displayParts ?? [])
            },
          }
        : undefined,
    ),
  )

  /**
   * Send request to client
   */

  function sendTsRequest<T>(command: string, args: any): Promise<T | null> {
    return connection.sendRequest<T>(
      options.typescript.tsserverRequestCommand!,
      [command, args],
    )
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
