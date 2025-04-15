// /// <reference types="@volar/typescript" />

export * from '@volar/language-service'
export * from '@mpxjs/language-core'
export * from './types'

import type * as ts from 'typescript'
// import { URI } from 'vscode-uri'
import { create as createTypeScriptSyntacticPlugin } from 'volar-service-typescript/lib/plugins/syntactic'
import { create as createTypeScriptDocCommentTemplatePlugin } from 'volar-service-typescript/lib/plugins/docCommentTemplate'

import type { IRequests } from '@mpxjs/typescript-plugin/src/requests'
import type {
  LanguageServiceContext,
  LanguageServicePlugin,
} from '@volar/language-service'

import { create as creatempxDocumentHighlightsPlugin } from './plugins/mpx-document-highlights'

export function getHybridModeLanguageServicePlugins(
  ts: typeof import('typescript'),
  tsPluginClient:
    | (IRequests & {
        getDocumentHighlights: (
          fileName: string,
          position: number,
        ) => Promise<ts.DocumentHighlights[] | null>
      })
    | undefined,
) {
  const plugins = [
    createTypeScriptSyntacticPlugin(ts),
    createTypeScriptDocCommentTemplatePlugin(ts),
    ...getCommonLanguageServicePlugins(ts, () => tsPluginClient),
  ]
  if (tsPluginClient) {
    plugins.push(
      creatempxDocumentHighlightsPlugin(tsPluginClient.getDocumentHighlights),
    )
  }
  for (const plugin of plugins) {
    // avoid affecting TS plugin
    delete plugin.capabilities.semanticTokensProvider
  }
  return plugins
}

function getCommonLanguageServicePlugins(
  ts: typeof import('typescript'),
  getTsPluginClient: (context: LanguageServiceContext) => IRequests | undefined,
): LanguageServicePlugin[] {
  return [
    // createTypeScriptTwoslashQueriesPlugin(ts),
    // createCssPlugin(),
    // createJsonPlugin(),
    // createMpxTemplatePlugin('html', getTsPluginClient),
    // createMpxMissingPropsHintsPlugin(getTsPluginClient),
    // createMpxCompilerDomErrorsPlugin(),
    // createMpxSfcPlugin(),
    // createMpxTwoslashQueriesPlugin(getTsPluginClient),
    // createMpxDocumentDropPlugin(ts, getTsPluginClient),
    // createMpxDocumentLinksPlugin(),
    // createMpxCompleteDefineAssignmentPlugin(),
    // createMpxAutoDotValuePlugin(ts, getTsPluginClient),
    // createMpxAutoAddSpacePlugin(),
    // createMpxInlayHintsPlugin(ts),
    // createMpxDirectiveCommentsPlugin(),
    // createMpxExtractFilePlugin(ts, getTsPluginClient),
    // {
    //   name: 'mpx-parse-sfc',
    //   capabilities: {
    //     executeCommandProvider: {
    //       commands: [Commands.ParseSfc],
    //     },
    //   },
    //   create() {
    //     return {
    //       executeCommand(_command, [source]) {
    //         return parse(source)
    //       },
    //     }
    //   },
    // },
  ]
}
