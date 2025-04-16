import type { Mapping } from '@volar/language-core'
import type { Code } from '../types'

export class MpxEmbeddedCode {
  public parentCodeId?: string
  public linkedCodeMappings: Mapping[] = []
  public embeddedCodes: MpxEmbeddedCode[] = []

  constructor(
    public id: string,
    public lang: string,
    public content: Code[],
  ) {}
}
