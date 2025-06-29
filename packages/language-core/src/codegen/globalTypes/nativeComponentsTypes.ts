export const nativeComponentsTypesFileName = 'mpx_native_components'

export const nativeComponentsTypesContents = `
export interface MpxNativeComponents extends NativeComponents {
  [name: string]: any
}

type NativeComponents = {
  [K in keyof NativeComponentAttrs]: NativeComponentAttrs[K] & ReservedProps
}

interface ReservedProps {
  key?: PropertyKey
  ref?: any
}

interface NativeComponentAttrs {
  img: MpxImg
  image: MpxImg
  // ..
}

interface MpxImg {
  src: string
}
`
