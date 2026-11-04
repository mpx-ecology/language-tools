import '@mpxjs/core'
import Badge from './badge.mpx'
declare module '@mpxjs/core' {
  interface GlobalComponents {
    TypedBadge: typeof Badge
  }
}
