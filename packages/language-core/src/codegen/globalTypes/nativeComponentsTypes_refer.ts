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
  // 视图容器
  'cover-image': MpxCoverImage
  'cover-view': MpxCoverView
  'match-media': MpxMatchMedia
  'movable-area': MpxMovableArea
  'movable-view': MpxMovableView
  'page-container': MpxPageContainer
  'root-portal': MpxRootPortal
  'scroll-view': MpxScrollView
  swiper: MpxSwiper
  'swiper-item': MpxSwiperItem
  view: MpxView
}

interface MpxImg {
  src: string
}

interface MpxCoverImage {
  src?: string
  'referrer-policy'?: string
  bindload?: Function
  binderror?: Function
}

interface MpxCoverView {
  'scroll-top'?: number | string
}

interface MpxMatchMedia {
  'min-width'?: number
  'max-width'?: number
  width?: number
  'min-height'?: number
  'max-height'?: number
  height?: number
  orientation?: string
}

interface MpxMovableArea {
  'scale-area'?: boolean
}

interface MpxMovableView {
  direction?: string
  inertia?: boolean
  'out-of-bounds'?: boolean
  x?: number | string
  y?: number | string
  damping?: number
  friction?: number
  disabled?: boolean
  scale?: boolean
  'scale-min'?: number
  'scale-max'?: number
  'scale-value'?: number
  animation?: boolean
  bindchange?: Function
  bindscale?: Function
  htouchmove?: Function
  vtouchmove?: Function
}

interface MpxPageContainer {
  show?: boolean
  duration?: number
  'z-index'?: number
  overlay?: boolean
  position?: string
  round?: boolean
  'close-on-slide-down'?: boolean
  'overlay-style'?: string
  'custom-style'?: string
  // bind:beforeenter bind:enter bind:enter bind:afterenter bind:beforeleave bind:leave bind:afterleave bind:clickoverlay
}

interface MpxRootPortal {
  enable?: boolean
}

interface MpxScrollView {
  'scroll-x'?: boolean
  'scroll-y'?: boolean
  'upper-threshold'?: number | string
  'lower-threshold'?: number | string
  'scroll-top'?: number | string
  'scroll-left'?: number | string
  'scroll-into-view'?: string
  'scroll-into-view-offset'?: number
  'scroll-with-animation'?: boolean
  'enable-back-to-top'?: boolean
  'enable-passive'?: boolean
  'refresher-enabled'?: boolean
  'refresher-threshold'?: number
  'refresher-default-style'?: string
  'refresher-background'?: string
  'refresher-triggered'?: boolean
  bounces?: boolean
  'show-scrollbar'?: boolean
  'fast-deceleration'?: boolean
  binddragstart?: Function
  binddragging?: Function
  binddragend?: Function
  bindscrolltoupper?: Function
  bindscrolltolower?: Function
  bindscroll?: Function
  bindrefresherpulling?: Function
  bindrefresherrefresh?: Function
  bindrefresherrestore?: Function
  bindrefresherabort?: Function
  'scroll-anchoring'?: boolean
}

interface MpxSwiper {
  'indicator-dots'?: boolean
  'indicator-color'?: string
  'indicator-active-color'?: string
  autoplay?: boolean
  current?: number
  interval?: number
  duration?: number
  circular?: boolean
  vertical?: boolean
  'display-multiple-items'?: number
  'previous-margin'?: string
  'next-margin'?: string
  'easing-function'?: string
  direction?: string
  bindchange?: Function
  bindtransition?: Function
  bindanimationfinish?: Function
}

interface MpxSwiperItem {
  'item-id'?: string
  'skip-hidden-item-layout'?: boolean
}

interface MpxView {
  'hover-class'?: string
  'hover-stop-propagation'?: boolean
  'hover-start-time'?: number
  'hover-stay-time'?: number
}
