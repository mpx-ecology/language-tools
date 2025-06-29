/**
 * ! 注意: 类型定义更新后后需要手动同步更新到 `nativeComponents.ts` 文件才能最终生效
 *
 * Mpx 原生组件类型定义
 * - 组件属性必要性检查
 * - 组件属性类型检查
 */

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
