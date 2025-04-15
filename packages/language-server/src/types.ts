export type MpxInitializationOptions = {
  typescript: {
    tsdk: string
    tsserverRequestCommand?: 'tsserverRequest'
  }
}

export * from '@volar/language-server/lib/types'
export * from '@mpxjs/language-service/out/types'
