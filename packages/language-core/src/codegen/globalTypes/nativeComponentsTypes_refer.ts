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
  [K in keyof NativeComponentAttrs]: NativeComponentAttrs[K] &
    Kubab2Camel<NativeComponentAttrs[K]>
}
type Kubab2Camel<T> = {
  [K in keyof T as Camel<K>]: T[K]
}
type Camel<K> = K extends `${infer K1}-${infer K2}`
  ? `${K1}${Capitalize<Camel<K2>>}`
  : K
type EventHandler<T = any> = ($event: T, ...args: any[]) => void
interface NativeComponentAttrs {
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
  icon: MpxIcon
  progress: MpxProgress
  'rich-text': MpxRichText
  selection: MpxSelection
  text: MpxText
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
  'functional-page-navigator': MpxFunctionalPageNavigator
  navigator: MpxNavigator
  audio: MpxAudio
  camera: MpxCamera
  'channel-live': MpxChannelLive
  'channel-video': MpxChannelVideo
  image: MpxImage
  'live-player': MpxLivePlayer
  'live-pusher': MpxLivePusher
  video: MpxVideo
  'video-room': MpxVideoRoom
  map: MpxMap
  canvas: MpxCanvas
}
interface MpxCoverImage {
  src?: string
  'referrer-policy'?: string
  bindload?: EventHandler
  binderror?: EventHandler
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
  bindchange?: EventHandler
  bindscale?: EventHandler
  htouchmove?: EventHandler
  vtouchmove?: EventHandler
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
  binddragstart?: EventHandler
  binddragging?: EventHandler
  binddragend?: EventHandler
  bindscrolltoupper?: EventHandler
  bindscrolltolower?: EventHandler
  bindscroll?: EventHandler
  bindrefresherpulling?: EventHandler
  bindrefresherrefresh?: EventHandler
  bindrefresherrestore?: EventHandler
  bindrefresherabort?: EventHandler
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
  bindchange?: EventHandler
  bindtransition?: EventHandler
  bindanimationfinish?: EventHandler
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
  bindactiveend?: EventHandler
}
interface MpxRichText {
  nodes?: Array<string> | string
  space?: string
  'user-select'?: boolean
}
interface MpxSelection {
  'disabled-context-menu'?: boolean
  bindselectionchange?: EventHandler
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
  bindgetuserinfo?: EventHandler
  bindcontact?: EventHandler
  createliveactivity?: EventHandler
  bindgetphonenumber?: EventHandler
  bindgetrealtimephonenumber?: EventHandler
  binderror?: EventHandler
  bindopensetting?: EventHandler
  bindlaunchapp?: EventHandler
  bindchooseavatar?: EventHandler
  bindagreeprivacyauthorization?: EventHandler
}
interface MpxCheckbox {
  value?: string
  disabled?: boolean
  checked?: boolean
  color?: string
}
interface MpxCheckboxGroup {
  bindchange?: EventHandler
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
  bindready?: EventHandler
  bindfocus?: EventHandler
  bindblur?: EventHandler
  bindinput?: EventHandler
  bindstatuschange?: EventHandler
}
interface MpxEditorPortal {
  key: string
}
interface MpxForm {
  'report-submit'?: boolean
  'report-submit-timeout'?: number
  bindsubmit?: EventHandler
  bindreset?: EventHandler
  bindsubmitToGroup?: EventHandler
}
interface MpxInput {
  value?: string
  type?: string
  password?: boolean
  placeholder?: string
  'placeholder-style'?: string
  disabled?: boolean
  maxlength?: number
  'cursor-spacing'?: number
  'auto-focus'?: boolean
  focus?: boolean
  'confirm-type'?: string
  'always-embed'?: boolean
  'confirm-hold'?: boolean
  cursor?: number
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
  bindinput?: EventHandler
  bindchange?: EventHandler
  bindfocus?: EventHandler
  bindblur?: EventHandler
  bindconfirm?: EventHandler
  bindkeyboardheightchange?: EventHandler
  bindnicknamereview?: EventHandler
}
interface MpxLabel {
  for?: string
}
interface MpxPicker {
  'header-text'?: string
  mode?: string
  disabled?: boolean
  bindcancel?: EventHandler
}
interface MpxPickerView {
  value?: Array<number>
  'mask-class'?: string
  'indicator-style'?: string
  bindchange?: EventHandler
  bindpickstart?: EventHandler
  bindpickend?: EventHandler
}
interface MpxRadio {
  value?: string
  checked?: boolean
  disabled?: boolean
  color?: string
}
interface MpxRadioGroup {
  bindchange?: EventHandler
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
  bindchange?: EventHandler
  bindchanging?: EventHandler
}
interface MpxSwitch {
  checked?: boolean
  disabled?: boolean
  type?: string
  color?: string
  bindchange?: EventHandler
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
  cursor?: number
  'selection-start'?: number
  'selection-end'?: number
  'adjust-position'?: boolean
  'hold-keyboard'?: boolean
  'disable-default-padding'?: boolean
  'confirm-type'?: string
  'confirm-hold'?: boolean
  'adjust-keyboard-to'?: boolean
  bindfocus?: EventHandler
  bindblur?: EventHandler
  bindlinechange?: EventHandler
  bindinput?: EventHandler
  bindconfirm?: EventHandler
  bindkeyboardheightchange?: EventHandler
}
interface MpxFunctionalPageNavigator {
  version?: string
  name?: string
  args?: object
  bindsuccess?: EventHandler
  bindfail?: EventHandler
  bindcancel?: EventHandler
}
interface MpxNavigator {
  target?: string
  url?: string
  'open-type'?: string
  delta?: number
  'app-id'?: string
  path?: string
  'extra-data'?: object
  version?: string
  'short-link'?: string
  'hover-class'?: string
  'hover-stop-propagation'?: boolean
  'hover-start-time'?: number
  'hover-stay-time'?: number
  bindsuccess?: EventHandler
  bindfail?: EventHandler
  bindcomplete?: EventHandler
}
interface MpxAudio {
  id?: string
  src?: string
  loop?: boolean
  controls?: boolean
  poster?: string
  name?: string
  author?: string
  binderror?: EventHandler
  bindplay?: EventHandler
  bindpause?: EventHandler
  bindtimeupdate?: EventHandler
  bindended?: EventHandler
}
interface MpxCamera {
  mode?: string
  resolution?: string
  'device-position'?: string
  flash?: string
  'frame-size'?: string
  bindstop?: EventHandler
  binderror?: EventHandler
  bindinitdone?: EventHandler
  bindscandone?: EventHandler
}
interface MpxChannelLive {
  'feed-id': string
  'finder-user-name': string
}
interface MpxChannelVideo {
  'feed-id': string
  'finder-user-name': string
  'feed-token': string
  autoplay?: boolean
  loop?: boolean
  muted?: boolean
  'object-fit'?: string
  binderror?: EventHandler
}
interface MpxImage {
  src?: string
  mode?: string
  'show-menu-by-longpress'?: boolean
  binderror?: EventHandler
  bindload?: EventHandler
}
interface MpxLivePlayer {
  src?: string
  mode?: string
  autoplay?: boolean
  muted?: boolean
  orientation?: string
  'object-fit'?: string
  'background-mute'?: boolean
  'min-cache'?: number
  'max-cache'?: number
  'sound-mode'?: string
  'auto-pause-if-navigate'?: boolean
  'auto-pause-if-open-native'?: boolean
  'picture-in-picture-mode'?: string | Array<string>
  'picture-in-picture-init-position'?: string
  'enable-auto-rotation'?: boolean
  'referrer-policy'?: string
  'enable-casting'?: boolean
  bindstatechange?: EventHandler
  bindfullscreenchange?: EventHandler
  bindnetstatus?: EventHandler
  bindaudiovolumeupdate?: EventHandler
  bindenterpictureinpicture?: EventHandler
  bindleavepictureinpicture?: EventHandler
  bindcastinguserselect?: EventHandler
  bindcastingstatechange?: EventHandler
  bindcastinginterrupt?: EventHandler
}
interface MpxLivePusher {
  url?: string
  mode?: string
  autoplay?: boolean
  enableVideoCustomRender?: boolean
  muted?: boolean
  'enable-camera'?: boolean
  'auto-focus'?: boolean
  orientation?: string
  beauty?: number
  whiteness?: number
  aspect?: string
  'min-bitrate'?: number
  'max-bitrate'?: number
  'audio-quality'?: string
  'waiting-image'?: string
  'waiting-image-hash'?: string
  zoom?: boolean
  'device-position'?: string
  'background-mute'?: boolean
  mirror?: boolean
  'remote-mirror'?: boolean
  'local-mirror'?: string
  'audio-reverb-type'?: number
  'enable-mic'?: boolean
  'enable-agc'?: boolean
  'enable-ans'?: boolean
  'audio-volume-type'?: string
  'video-width'?: number
  'video-height'?: number
  'beauty-style'?: string
  filter?: string
  'picture-in-picture-mode'?: string | Array<string>
  'voice-changer-type'?: number
  'custom-effects'?: boolean
  'skin-whiteness'?: number
  'skin-smoothness'?: number
  'face-thinness'?: number
  'eye-bigness'?: number
  fps?: number
  bindstatechange?: EventHandler
  bindnetstatus?: EventHandler
  binderror?: EventHandler
  bindbgmstart?: EventHandler
  bindbgmprogress?: EventHandler
  bindbgmcomplete?: EventHandler
  bindaudiovolumenotify?: EventHandler
  bindenterpictureinpicture?: EventHandler
  bindleavepictureinpicture?: EventHandler
}
interface MpxVideo {
  src: string
  duration?: number
  controls?: boolean
  'danmu-list'?: Array<object>
  'danmu-btn'?: boolean
  'enable-danmu'?: boolean
  autoplay?: boolean
  loop?: boolean
  muted?: boolean
  'initial-time'?: number
  'page-gesture'?: boolean
  direction?: number
  'show-progress'?: boolean
  'show-fullscreen-btn'?: boolean
  'show-play-btn'?: boolean
  'show-center-play-btn'?: boolean
  'enable-progress-gesture'?: boolean
  'object-fit'?: string
  poster?: string
  'show-mute-btn'?: boolean
  title?: string
  'play-btn-position'?: string
  'enable-play-gesture'?: boolean
  'auto-play-gesture'?: boolean
  'auto-pause-if-navigate'?: boolean
  'auto-pause-if-open-native'?: boolean
  'vslide-gesture'?: boolean
  'vslide-gesture-in-fullscreen'?: boolean
  'show-bottom-progress'?: boolean
  'ad-unit-id'?: string
  'poster-for-crawker'?: string
  'show-casting-button'?: boolean
  'picture-in-picture-mode'?: string | Array<string>
  'picture-in-picture-init-position'?: string
  'enable-auto-rotation'?: boolean
  'show-screen-lock-button'?: boolean
  'show-snapshot-button'?: boolean
  'show-background-playback-button'?: boolean
  'background-poster'?: string
  'referrer-policy'?: string
  'is-drm'?: boolean
  'is-live'?: boolean
  'provision-url'?: string
  'certificate-url'?: string
  'license-url'?: string
  'preferred-peak-bit-rate'?: number
  bindplay?: EventHandler
  bindpause?: EventHandler
  bindended?: EventHandler
  bindtimeupdate?: EventHandler
  bindfullscreenchange?: EventHandler
  bindwaiting?: EventHandler
  binderror?: EventHandler
  bindprogress?: EventHandler
  bindloadedmetadata?: EventHandler
  bindcontrolstoggle?: EventHandler
  bindenterpictureinpicture?: EventHandler
  bindleavepictureinpicture?: EventHandler
  bindseekcomplete?: EventHandler
  bindcastinguserselect?: EventHandler
  bindcastingstatechange?: EventHandler
  bindcastinginterrupt?: EventHandler
}
interface MpxVideoRoom {
  openid: string
  mode: string
  'device-position': string
  'object-fit': string
  binderror?: EventHandler
}
interface MpxMap {
  longitude: number
  latitude: number
  scale?: number
  'min-scale'?: number
  'max-scale'?: number
  markers?: Array<object>
  covers?: Array<object>
  polyline?: Array<object>
  circles?: Array<object>
  controls?: Array<object>
  'include-points'?: Array<object>
  'show-location'?: boolean
  polygons?: Array<object>
  subkey?: string
  'layer-style'?: number
  rotate?: number
  skew?: number
  'enable-3D'?: boolean
  'show-compass'?: boolean
  'show-scale'?: boolean
  'enable-overlooking'?: boolean
  'enable-auto-max-overlooking'?: boolean
  'enable-zoom'?: boolean
  'enable-scroll'?: boolean
  'enable-rotate'?: boolean
  'enable-satellite'?: boolean
  'enable-traffic'?: boolean
  'enable-poi'?: boolean
  'enable-building'?: boolean
  setting?: object
  bindtap?: EventHandler
  bindmarkertap?: EventHandler
  bindlabeltap?: EventHandler
  bindcontroltap?: EventHandler
  bindcallouttap?: EventHandler
  bindupdated?: EventHandler
  bindregionchange?: EventHandler
  bindpoitap?: EventHandler
  bindpolylinetap?: EventHandler
  bindabilitysuccess?: EventHandler
  bindabilityfail?: EventHandler
  bindauthsuccess?: EventHandler
  bindinterpolatepoint?: EventHandler
  binderror?: EventHandler
}
interface MpxCanvas {
  type?: string
  'canvas-id'?: string
  'disable-scroll'?: boolean
  bindtouchstart?: EventHandler
  bindtouchmove?: EventHandler
  bindtouchend?: EventHandler
  bindtouchcancel?: EventHandler
  bindlongtap?: EventHandler
  binderror?: EventHandler
}
