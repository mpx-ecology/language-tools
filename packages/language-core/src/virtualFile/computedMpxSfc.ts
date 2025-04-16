import type * as ts from 'typescript'
import type { SFCParseResult } from '@vue/compiler-sfc'
import type { MpxLanguagePluginReturn } from '../types'

import { computed } from 'alien-signals'

export function computedMpxSfc(
  plugins: MpxLanguagePluginReturn[],
  fileName: string,
  languageId: string,
  getSnapshot: () => ts.IScriptSnapshot,
) {
  let cache:
    | {
        snapshot: ts.IScriptSnapshot
        sfc: SFCParseResult
        plugin: MpxLanguagePluginReturn
      }
    | undefined

  return computed(() => {
    // incremental update
    if (cache?.plugin.updateSFC) {
      const change = getSnapshot().getChangeRange(cache.snapshot)
      if (change) {
        const newSfc = cache.plugin.updateSFC(cache.sfc, {
          start: change.span.start,
          end: change.span.start + change.span.length,
          newText: getSnapshot().getText(
            change.span.start,
            change.span.start + change.newLength,
          ),
        })
        if (newSfc) {
          cache.snapshot = getSnapshot()
          // force dirty
          cache.sfc = JSON.parse(JSON.stringify(newSfc))
          return cache.sfc
        }
      }
    }

    for (const plugin of plugins) {
      const sfc =
        plugin.parseSFC?.(
          fileName,
          getSnapshot().getText(0, getSnapshot().getLength()),
        ) ??
        plugin.parseSFC2?.(
          fileName,
          languageId,
          getSnapshot().getText(0, getSnapshot().getLength()),
        )
      if (sfc) {
        if (!sfc.errors.length) {
          cache = {
            snapshot: getSnapshot(),
            sfc,
            plugin,
          }
        }
        return sfc
      }
    }
  })
}
