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
  )

  addMpxCommands()

  return {
    languagePlugins: [languagePlugin],
    setup: language => {
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
    if (info.project.projectKind === ts.server.ProjectKind.Configured) {
      const tsconfig = info.project.getProjectName()
      return mpx.createParsedCommandLine(
        ts,
        ts.sys,
        tsconfig.replace(windowsPathReg, '/'),
      ).mpxOptions
    } else {
      return mpx.createParsedCommandLineByJson(
        ts,
        ts.sys,
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
