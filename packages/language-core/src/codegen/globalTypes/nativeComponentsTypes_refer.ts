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

  //基础内容
  icon: MpxIcon
  progress: MpxProgress
  'rich-text': MpxRichText
  selection: MpxSelection
  text: MpxText

  //表单组件
  button: MpxButton
  checkbox: MpxCheckbox
  'checkbox-group': MpxCheckboxGroup
  editor: MpxEditor
  'editor-portal': MpxEditorPortal
  form: MpxForm
  input: MpxInput
  label: MpxLabel
  picker: MpxPicker
  'picker-view': MpxPickerView
  radio: MpxRadio
  'radio-group': MpxRadioGroup
  slider: MpxSlider
  switch: MpxSwitch
  textarea: MpxTextarea
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

interface MpxIcon {
  type: string
  size?: number | string
  color?: string
}

interface MpxProgress {
  percent?: number
  'show-info'?: boolean
  'border-radius'?: number | string
  'font-size'?: number | string
  'stroke-width'?: number | string
  color?: string
  activeColor?: string
  backgroundColor?: string
  active?: boolean
  'active-mode'?: string
  duration?: number
  bindactiveend?: Function
}

interface MpxRichText {
  nodes?: Array<string> | string
  space?: string
  'user-select'?: boolean
}

interface MpxSelection {
  'disabled-context-menu'?: boolean
  bindselectionchange?: Function
}

interface MpxText {
  selectable?: boolean
  'user-select'?: boolean
}

interface MpxButton {
  size?: string
  type?: string
  plain?: boolean
  disabled?: boolean
  loading?: boolean
  'form-type'?: string
  'open-type'?: string
  'hover-class'?: string
  'hover-stop-propagation'?: boolean
  'hover-start-time'?: number
  'hover-stay-time'?: number
  lang?: string
  'session-from'?: string
  'send-message-title'?: string
  'send-message-path'?: string
  'send-message-img'?: string
  'app-parameter'?: string
  'show-message-card'?: boolean
  'phone-number-no-quota-toast'?: boolean
  'need-show-entrance'?: boolean
  'entrance-path'?: string
  bindgetuserinfo?: Function
  bindcontact?: Function
  createliveactivity?: Function
  bindgetphonenumber?: Function
  bindgetrealtimephonenumber?: Function
  binderror?: Function
  bindopensetting?: Function
  bindlaunchapp?: Function
  bindchooseavatar?: Function
  bindagreeprivacyauthorization?: Function
}

interface MpxCheckbox {
  value?: string
  disabled?: boolean
  checked?: boolean
  color?: string
}

interface MpxCheckboxGroup {
  bindchange?: Function
}

interface MpxEditor {
  'read-only'?: boolean
  placeholder?: string
  'show-img-size'?: boolean
  'show-img-toolbar'?: boolean
  'show-img-resize'?: boolean
  'enable-formats'?: boolean
  enterkeyhint?: string
  'confirm-hold'?: boolean
  bindready?: Function
  bindfocus?: Function
  bindblur?: Function
  bindinput?: Function
  bindstatuschange?: Function
}

interface MpxEditorPortal {
  key: string
}

interface MpxForm {
  'report-submit'?: boolean
  'report-submit-timeout'?: number
  bindsubmit?: Function
  bindreset?: Function
  bindsubmitToGroup?: Function
}

interface MpxInput {
  value: string
  type?: string
  password?: boolean
  placeholder: string
  'placeholder-style': string
  disabled?: boolean
  maxlength?: number
  'cursor-spacing'?: number
  'auto-focus'?: boolean
  focus?: boolean
  'confirm-type'?: string
  'always-embed'?: boolean
  'confirm-hold'?: boolean
  cursor: number
  'cursor-color'?: string
  'selection-start'?: number
  'selection-end'?: number
  'adjust-position'?: boolean
  'hold-keyboard'?: boolean
  'safe-password-cert-path'?: string
  'safe-password-length'?: number
  'safe-password-time-stamp'?: number
  'safe-password-nonce'?: string
  'safe-password-salt'?: string
  'safe-password-custom-hash'?: string
  bindinput: Function
  bindchange: Function
  bindfocus: Function
  bindblur: Function
  bindconfirm: Function
  bindkeyboardheightchange: Function
  bindnicknamereview: Function
}

interface MpxLabel {
  for?: string
}

interface MpxPicker {
  'header-text'?: string
  mode?: string
  disabled?: boolean
  bindcancel?: Function
}

interface MpxPickerView {
  value?: Array<number>
  'mask-class'?: string
  'indicator-style'?: string
  bindchange?: Function
  bindpickstart?: Function
  bindpickend?: Function
}

interface MpxRadio {
  value?: string
  checked?: boolean
  disabled?: boolean
  color?: string
}

interface MpxRadioGroup {
  bindchange?: Function
}

interface MpxSlider {
  min?: number
  max?: number
  step?: number
  disabled?: boolean
  value?: number
  color?: string
  'selected-color'?: string
  activeColor?: string
  backgroundColor?: string
  'block-size'?: number
  'block-color'?: string
  'show-value'?: boolean
  bindchange?: Function
  bindchanging?: Function
}

interface MpxSwitch {
  checked?: boolean
  disabled?: boolean
  type?: string
  color?: string
  bindchange?: Function
}

interface MpxTextarea {
  value?: string
  placeholder?: string
  'placeholder-style'?: string
  disabled?: boolean
  maxlength?: number
  'auto-focus'?: boolean
  focus?: boolean
  'auto-height'?: boolean
  'cursor-spacing'?: number
  cursor: number
  'selection-start'?: number
  'selection-end'?: number
  'adjust-position'?: boolean
  'hold-keyboard'?: boolean
  'disable-default-padding'?: boolean
  'confirm-type'?: string
  'confirm-hold'?: boolean
  'adjust-keyboard-to'?: boolean
  bindfocus: Function
  bindblur: Function
  bindlinechange: Function
  bindinput: Function
  bindconfirm: Function
  bindkeyboardheightchange: Function
}
