import type { LanguageServicePlugin } from '@volar/language-service'
import { create as createSemantic } from 'volar-service-typescript/lib/plugins/semantic'

// In IDE mode this project's host exposes only JSON JS as TypeScript scripts.
// Use the standard semantic service so edits and targets use Volar's mappings.
export function create(ts: typeof import('typescript')): LanguageServicePlugin {
  return {
    // The IDE already maintains the package auto-import index in tsserver.
    // Avoid a second cache and its file-watcher subscription for JSON projects.
    ...createSemantic(ts, { disableAutoImportCache: true }),
    name: 'mpx-json-js',
  }
}
