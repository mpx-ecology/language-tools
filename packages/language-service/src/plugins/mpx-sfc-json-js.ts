// import type { IRequests } from '@mpxjs/typescript-plugin/src/requests'
// import type {
//   LanguageServiceContext,
//   LanguageServicePlugin,
// } from '@volar/language-service'

// export function create(
//   _ts: typeof import('typescript'),
//   getTsPluginClient: (context: LanguageServiceContext) => IRequests | undefined,
// ): LanguageServicePlugin {
//   return {
//     name: 'mpx-json-js',

//     capabilities: {
//       diagnosticProvider: {
//         interFileDependencies: true,
//         workspaceDiagnostics: false,
//       },
//     },

//     create(context) {
//       if (!context.project.mpx) {
//         return {}
//       }

//       const tsPluginClient = getTsPluginClient?.(context)

//       return {}
//     },
//   }
// }
