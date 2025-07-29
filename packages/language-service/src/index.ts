/// <reference types="@volar/typescript" />

import type * as ts from 'typescript'
import type { IRequests } from '@mpxjs/typescript-plugin/src/requests'
import type {
  LanguageServiceContext,
  LanguageServicePlugin,
} from '@volar/language-service'
import { parse } from '@mpxjs/language-core'
import { create as createEmmetPlugin } from 'volar-service-emmet'
import { create as createTypeScriptSyntacticPlugin } from 'volar-service-typescript/lib/plugins/syntactic'
import { create as createTypeScriptDocCommentTemplatePlugin } from 'volar-service-typescript/lib/plugins/docCommentTemplate'
import { create as creatempxDocumentHighlightsPlugin } from './plugins/mpx-document-highlights'
import { create as createMpxSfcPlugin } from './plugins/mpx-sfc'
import { create as createMpxTemplatePlugin } from './plugins/mpx-sfc-template'
import { create as createMpxTemplateCompilerErrorsPlugin } from './plugins/mpx-sfc-template-compiler-errors'
import { create as createMpxTemplateDirectiveCommentsPlugin } from './plugins/mpx-sfc-template-directive-comments'
import { create as createMpxStyleCSSPlugin } from './plugins/mpx-sfc-style-css'
import { create as createMpxStyleStylusPlugin } from './plugins/mpx-sfc-style-stylus'
import { create as createMpxJsonJsonPlugin } from './plugins/mpx-sfc-json-json'
import { create as createMpxTemplateLinksPlugin } from './plugins/mpx-sfc-template-links'
import { create as createMpxJsonLinksPlugin } from './plugins/mpx-sfc-json-links'
import { Commands } from './types'

export * from '@volar/language-service'
export * from '@mpxjs/language-core'
export * from './types'

export function createMpxLanguageServicePlugins(
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
  _ts: typeof import('typescript'),
  _getTsPluginClient: (
    context: LanguageServiceContext,
  ) => IRequests | undefined,
): LanguageServicePlugin[] {
  return [
    createMpxSfcPlugin(),
    createMpxTemplatePlugin(),
    createMpxTemplateCompilerErrorsPlugin(),
    createMpxTemplateDirectiveCommentsPlugin(),
    createMpxStyleCSSPlugin(),
    createMpxStyleStylusPlugin(),
    // createMpxJsonJsPlugin(ts, getTsPluginClient),
    createMpxJsonJsonPlugin(),
    createMpxTemplateLinksPlugin(),
    createMpxJsonLinksPlugin(),
    createEmmetPlugin({
      mappedLanguages: {
        'mpx-root-tags': 'html',
        postcss: 'scss',
      },
    }),
    {
      name: 'mpx-parse-sfc',
      capabilities: {
        executeCommandProvider: {
          commands: [Commands.ParseSfc],
        },
      },
      create() {
        return {
          executeCommand(_command, [source]) {
            return parse(source)
          },
        }
      },
    },
  ]
}
