import type * as ts from 'typescript'
import type { RequestContext } from './requests/types'

import { createLanguageServicePlugin } from '@volar/typescript/lib/quickstart/createLanguageServicePlugin'
import * as mpx from '@mpxjs/language-core'
import { proxyLanguageServiceForMpx } from './common'
import { collectExtractProps } from './requests/collectExtractProps'
import { getComponentDirectives } from './requests/getComponentDirectives'
import { getComponentEvents } from './requests/getComponentEvents'
import { getComponentNames } from './requests/getComponentNames'
import { getComponentProps } from './requests/getComponentProps'
import { getElementAttrs } from './requests/getElementAttrs'
import { getElementNames } from './requests/getElementNames'
import { getImportPathForFile } from './requests/getImportPathForFile'
import { getPropertiesAtLocation } from './requests/getPropertiesAtLocation'
import { getCompletionAtPostion } from './requests/getCompletion'
import { createProjectGraphScope } from './utils/projectGraph'

const windowsPathReg = /\\/g
const project2Service = new WeakMap<
  ts.server.Project,
  [mpx.Language, ts.LanguageServiceHost, ts.LanguageService]
>()

export = createLanguageServicePlugin((ts, info) => {
  const mpxOptions = getMpxCompilerOptions()
  const languagePlugin = mpx.createMpxLanguagePlugin<string>(
    ts,
    info.languageServiceHost.getCompilationSettings(),
    mpxOptions,
    id => id,
    undefined,
    true,
    { serviceScriptOnly: true },
  )

  // Install before Volar captures filesystem methods for module resolution.
  const withProjectGraphScope = mpxOptions.plugins.length
    ? <T>(run: () => T) => run()
    : createProjectGraphScope(info.languageServiceHost)
  addMpxCommands()

  return {
    languagePlugins: [languagePlugin],
    setup: language => {
      const syncedAppVersions = new Map<string, string | undefined>()
      const getAppVersion = (fileName: string) => {
        const scriptInfo = info.project.getScriptInfo(fileName)
        return scriptInfo && !scriptInfo.isOrphan()
          ? scriptInfo.getLatestVersion()
          : undefined
      }
      const recordTrackedApplications = () => {
        const tracked = languagePlugin.getTrackedApplications()
        const trackedSet = new Set(tracked)
        for (const fileName of syncedAppVersions.keys()) {
          if (!trackedSet.has(fileName)) syncedAppVersions.delete(fileName)
        }
        for (const fileName of tracked) {
          if (!syncedAppVersions.has(fileName)) {
            syncedAppVersions.set(fileName, getAppVersion(fileName))
          }
        }
      }
      const syncTrackedApplications = () => {
        const tracked = languagePlugin.getTrackedApplications()
        const trackedSet = new Set(tracked)
        for (const fileName of syncedAppVersions.keys()) {
          if (!trackedSet.has(fileName)) syncedAppVersions.delete(fileName)
        }
        for (const fileName of tracked) {
          const version = getAppVersion(fileName)
          const hadEntry = syncedAppVersions.has(fileName)
          if (hadEntry && syncedAppVersions.get(fileName) === version) continue
          syncedAppVersions.set(fileName, version)
          if (version === undefined) {
            if (hadEntry) language.scripts.delete(fileName)
          } else if (hadEntry || !languagePlugin.hasVirtualCode(fileName)) {
            language.scripts.get(fileName, undefined, true)
          }
        }
      }
      const drainExternalChanges = () => {
        let changed = false
        languagePlugin.getExternalFilesVersion(undefined, fileName => {
          const source = language.scripts.get(fileName)
          if (source) source.isAssociationDirty = true
          changed = true
        })
        return changed
      }
      const updateGraph = info.project.updateGraph.bind(info.project)
      info.project.updateGraph = () =>
        withProjectGraphScope(() =>
          languagePlugin.withComponentFileStats(() => {
            try {
              return updateGraph()
            } finally {
              recordTrackedApplications()
            }
          }),
        )
      const close = info.project.close.bind(info.project)
      info.project.close = () => {
        try {
          close()
        } finally {
          syncedAppVersions.clear()
          languagePlugin.dispose()
        }
      }
      const getLanguageService = info.project.getLanguageService.bind(
        info.project,
      )
      info.project.getLanguageService = ensureSynchronized => {
        if (ensureSynchronized !== false) syncTrackedApplications()
        // tsserver's clean-project fast path bypasses getProjectVersion. A new
        // platform file can sit outside include, so no root-file watcher fires.
        if (drainExternalChanges()) info.project.updateGraph()
        const service = getLanguageService(ensureSynchronized)
        // If updateGraph checked a consumer page before its app.mpx, the
        // resulting invalidation arrives during sync above; apply it once now.
        if (ensureSynchronized !== false && drainExternalChanges()) {
          info.project.updateGraph()
        }
        return service
      }
      mpx.decorateMpxLanguageServiceHost(
        info.languageServiceHost,
        languagePlugin,
        fileName => {
          const source = language.scripts.get(fileName)
          if (source) source.isAssociationDirty = true
        },
      )
      project2Service.set(info.project, [
        language,
        info.languageServiceHost,
        info.languageService,
      ])

      info.languageService = proxyLanguageServiceForMpx(
        ts,
        language,
        info.languageService,
        mpxOptions,
        fileName => fileName,
      )

      const timer = setInterval(() => {
        if (info.project['program']) {
          clearInterval(timer)
          info.project['program'].__mpx__ = { language }
        }
      }, 50)
    },
  }

  function getMpxCompilerOptions() {
    // tsserver already computed the project roots; this pass only reads options.
    const configHost = { ...ts.sys, readDirectory: () => [] }
    if (info.project.projectKind === ts.server.ProjectKind.Configured) {
      const tsconfig = info.project.getProjectName()
      return mpx.createParsedCommandLine(
        ts,
        configHost,
        tsconfig.replace(windowsPathReg, '/'),
      ).mpxOptions
    } else {
      return mpx.createParsedCommandLineByJson(
        ts,
        configHost,
        info.languageServiceHost.getCurrentDirectory(),
        {},
      ).mpxOptions
    }
  }

  function addMpxCommands() {
    const projectService = info.project.projectService
    projectService.logger.info(
      'Mpx: called handler processing ' + info.project.projectKind,
    )

    const session = info.session
    if (session == undefined) {
      projectService.logger.info('Mpx: there is no session in info.')
      return
    }
    if (session.addProtocolHandler == undefined) {
      // addProtocolHandler was introduced in TS 4.4 or 4.5 in 2021, see https://github.com/microsoft/TypeScript/issues/43893
      projectService.logger.info('Mpx: there is no addProtocolHandler method.')
      return
    }

    if ((session as any).handlers.has('_mpx:projectInfo')) {
      return
    }

    session.addProtocolHandler('_mpx:fileReferences', ({ arguments: args }) => {
      return (session as any).handlers.get('fileReferences')?.({
        arguments: args,
      })
    })

    session.addProtocolHandler('_mpx:projectInfo', ({ arguments: args }) => {
      return (session as any).handlers.get('projectInfo')?.({ arguments: args })
    })

    session.addProtocolHandler(
      '_mpx:collectExtractProps',
      ({ arguments: args }) => {
        return {
          response: collectExtractProps.apply(getRequestContext(args[0]), args),
        }
      },
    )
    session.addProtocolHandler(
      '_mpx:documentHighlights-full',
      ({ arguments: args }) => {
        return (session as any).handlers.get('documentHighlights-full')?.({
          arguments: args,
        })
      },
    )
    session.addProtocolHandler('_mpx:quickinfo', ({ arguments: args }) => {
      return (session as any).handlers.get('quickinfo')?.({ arguments: args })
    })
    session.addProtocolHandler(
      '_mpx:getImportPathForFile',
      ({ arguments: args }) => {
        return {
          response: getImportPathForFile.apply(
            getRequestContext(args[0]),
            args,
          ),
        }
      },
    )
    session.addProtocolHandler('_mpx:getCompletion', ({ arguments: args }) => {
      return {
        response: getCompletionAtPostion.apply(
          getRequestContext(args[0]),
          args,
        ),
      }
    })
    session.addProtocolHandler(
      '_mpx:getPropertiesAtLocation',
      ({ arguments: args }) => {
        return {
          response: getPropertiesAtLocation.apply(
            getRequestContext(args[0]),
            args,
          ),
        }
      },
    )
    session.addProtocolHandler(
      '_mpx:getComponentNames',
      ({ arguments: args }) => {
        return {
          response:
            getComponentNames.apply(getRequestContext(args[0]), args) ?? [],
        }
      },
    )
    session.addProtocolHandler(
      '_mpx:getComponentProps',
      ({ arguments: args }) => {
        return {
          response: getComponentProps.apply(getRequestContext(args[0]), args),
        }
      },
    )
    session.addProtocolHandler(
      '_mpx:getComponentEvents',
      ({ arguments: args }) => {
        return {
          response: getComponentEvents.apply(getRequestContext(args[0]), args),
        }
      },
    )
    session.addProtocolHandler(
      '_mpx:getComponentDirectives',
      ({ arguments: args }) => {
        return {
          response: getComponentDirectives.apply(
            getRequestContext(args[0]),
            args,
          ),
        }
      },
    )
    session.addProtocolHandler(
      '_mpx:getElementAttrs',
      ({ arguments: args }) => {
        return {
          response: getElementAttrs.apply(getRequestContext(args[0]), args),
        }
      },
    )
    session.addProtocolHandler(
      '_mpx:getElementNames',
      ({ arguments: args }) => {
        return {
          response: getElementNames.apply(getRequestContext(args[0]), args),
        }
      },
    )

    projectService.logger.info('Mpx specific commands are successfully added.')
  }

  function getRequestContext(fileName: string): RequestContext {
    const fileAndProject = (info.session as any).getFileAndProject({
      file: fileName,
      projectFileName: undefined,
    }) as {
      file: ts.server.NormalizedPath
      project: ts.server.Project
    }
    fileAndProject.project.getLanguageService()
    const service = project2Service.get(fileAndProject.project)
    if (!service) {
      throw 'No RequestContext'
    }
    return {
      typescript: ts,
      languageService: service[2],
      languageServiceHost: service[1],
      language: service[0],
      isTsPlugin: true,
      getFileId: (fileName: string) => fileName,
    }
  }
})
