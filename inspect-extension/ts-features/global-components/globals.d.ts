import '@mpxjs/core'
import TypedPanel from './app-a/panel.mpx'
declare module '@mpxjs/core' {
  export interface GlobalComponents {
    TypedPanel: typeof TypedPanel
    'typed-dash': typeof TypedPanel
    AppPanel: new (props: { mustNotLeak: boolean }) => {}
  }
}
