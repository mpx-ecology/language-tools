import type * as vscode from 'vscode-languageserver-protocol'
import { LanguageServicePlugin } from '../types'
import { templateCodegenHelper } from '../utils/templateCodegenHelper'

export function create(): LanguageServicePlugin {
  return {
    name: 'mpx-template-compiler-errors',

    capabilities: {
      diagnosticProvider: {
        interFileDependencies: false,
        workspaceDiagnostics: false,
      },
    },

    create(context) {
      return {
        provideDiagnostics(document) {
          if (document.languageId !== 'html') {
            return
          }

          const helper = templateCodegenHelper(context, document.uri)
          const template = helper?.sfc?.template
          const templateErrors: vscode.Diagnostic[] = []

          if (!template) {
            return templateErrors
          }

          for (const error of template.errors) {
            onCompilerError(
              error,
              1 satisfies typeof vscode.DiagnosticSeverity.Error,
            )
          }

          for (const warning of template.warnings) {
            onCompilerError(
              warning,
              2 satisfies typeof vscode.DiagnosticSeverity.Warning,
            )
          }

          function onCompilerError(
            error: NonNullable<typeof template>['errors'][number],
            severity: vscode.DiagnosticSeverity,
          ) {
            const templateHtmlRange = {
              start: error.loc?.start.offset ?? 0,
              end: error.loc?.end.offset ?? 0,
            }

            templateErrors.push({
              range: {
                start: document.positionAt(templateHtmlRange.start),
                end: document.positionAt(templateHtmlRange.end),
              },
              severity,
              code: error.code,
              source: 'mpx',
              message: error.message || 'mpx template error',
            })
          }

          return templateErrors
        },
      }
    },
  }
}
