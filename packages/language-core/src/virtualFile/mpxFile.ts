import type * as ts from 'typescript'
import type { VirtualCode } from '@volar/language-core'
import type { MpxCompilerOptions, MpxLanguagePluginReturn } from '../types'

import { computed, signal } from 'alien-signals'
import { allCodeFeatures } from '../plugins'
import { computedSfc } from './computedSfc'
import { computedMpxSfc } from './computedMpxSfc'
import { computedEmbeddedCodes } from './computedEmbeddedCodes'
export class MpxVirtualCode implements VirtualCode {
  id = 'main'

  private _snapshot = signal<ts.IScriptSnapshot>(undefined!)

  private _mpxSfc = computedMpxSfc(
    this.plugins,
    this.fileName,
    this.languageId,
    this._snapshot,
  )
  private _sfc = computedSfc(
    this.ts,
    this.plugins,
    this.fileName,
    this._snapshot,
    this._mpxSfc,
  )
  private _embeddedCodes = computedEmbeddedCodes(
    this.plugins,
    this.fileName,
    this._sfc,
  )
  private _mappings = computed(() => {
    const snapshot = this._snapshot()
    return [
      {
        sourceOffsets: [0],
        generatedOffsets: [0],
        lengths: [snapshot.getLength()],
        data: allCodeFeatures,
      },
    ]
  })

  get snapshot() {
    return this._snapshot()
  }
  get mpxSfc() {
    return this._mpxSfc()
  }
  get sfc() {
    return this._sfc
  }
  get embeddedCodes() {
    return this._embeddedCodes()
  }
  get mappings() {
    return this._mappings()
  }

  constructor(
    public fileName: string,
    public languageId: string,
    public initSnapshot: ts.IScriptSnapshot,
    public mpxCompilerOptions: MpxCompilerOptions,
    public plugins: MpxLanguagePluginReturn[],
    public ts: typeof import('typescript'),
  ) {
    this._snapshot(initSnapshot)
  }

  update(newSnapshot: ts.IScriptSnapshot) {
    this._snapshot(newSnapshot)
  }
}
