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

  // 导航组件
  'functional-page-navigator': MpxFunctionalPageNavigator
  navigator: MpxNavigator

  //媒体组件
  audio: MpxAudio
  camera: MpxCamera
  'channel-live': MpxChannelLive
  'channel-video': MpxChannelVideo
  image: MpxImage
  'live-player': MpxLivePlayer
  'live-pusher': MpxLivePusher
  video: MpxVideo
  'video-room': MpxVideoRoom

  //地图组件
  map: MpxMap

  //画布
  canvas: MpxCanvas
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

interface MpxFunctionalPageNavigator {
  version?: string
  name?: string
  args?: object
  bindsuccess?: Function
  bindfail?: Function
  bindcancel?: Function
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
  bindsuccess?: Function
  bindfail?: Function
  bindcomplete?: Function
}
interface MpxAudio {
  id?: string
  src?: string
  loop?: boolean
  controls?: boolean
  poster?: string
  name?: string
  ahthor?: string
  binderror?: Function
  bindplay?: Function
  bindpause?: Function
  bindtimeupdate?: Function
  bindended?: Function
}

interface MpxCamera {
  mode?: string
  resolution?: string
  'device-position'?: string
  flash?: string
  'frame-size'?: string
  bindstop?: Function
  binderror?: Function
  bindinitdone?: Function
  bindscandone?: Function
}

interface MpxChannelLive {
  'feed-id': string
  'finder-user-name': string
}

interface MpxChannelVideo {
  'feed-id': string
  'finder-user-name': string
  'feed-token'?: string
  autoplay?: string
  loop?: boolean
  muted?: boolean
  'object-fit'?: string
  binderror?: Function
}

interface MpxImage {
  src?: string
  mode?: string
  'show-menu-by-longpress'?: boolean
  binderror?: Function
  bindload?: Function
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
  bindstatechange?: Function
  bindfullscreenchange?: Function
  bindnetstatus?: Function
  bindaudiovolumeupdate?: Function
  bindenterpictureinpicture?: Function
  bindleavepictureinpicture?: Function
  bindcastinguserselect?: Function
  bindcastingstatechange?: Function
  bindcastinginterrupt?: Function
}

interface MpxLivePusher {
  url?: string
  mode?: string
  autoplay?: boolean
  enableVideoCustomRender?: boolean
  muted?: boolean
  'enable-camera': boolean
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
  bindstatechange?: Function
  bindnetstatus?: Function
  binderror?: Function
  bindbgmstart?: Function
  bindbgmprogress?: Function
  bindbgmcomplete?: Function
  bindaudiovolumenotify?: Function
  bindenterpictureinpicture?: Function
  bindleavepictureinpicture?: Function
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
  bindplay?: Function
  bindpause?: Function
  bindended?: Function
  bindtimeupdate?: Function
  bindfullscreenchange?: Function
  bindwaiting?: Function
  binderror?: Function
  bindprogress?: Function
  bindloadedmetadata?: Function
  bindontrolstoggle?: Function
  bindenterpictureinpicture?: Function
  bindleavepictureinpicture?: Function
  bindseekcomplete?: Function
  bindcastinguserselect?: Function
  bindcastingstatechange?: Function
  bindcastinginterrupt?: Function
}

interface MpxVideoRoom {
  openid: string
  mode: string
  'device-position': string
  'object-fit': string
  binderror?: Function
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
  ploygons?: Array<object>
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
  bindtap?: Function
  bindmarkertap?: Function
  bindlabeltap?: Function
  bindcontroltap?: Function
  bindcallouttap?: Function
  bindupdated?: Function
  bindregionchange?: Function
  bindpoitap?: Function
  bindpolulinetap?: Function
  bindabilitysuccess?: Function
  bindablityfail?: Function
  bindauthsuccess?: Function
  bindinterpolatepoint?: Function
  binderror?: Function
}

interface MpxCanvas {
  type?: string
  'canvas-id': string
  'disable-scroll'?: boolean
  bindtouchstart?: Function
  bindtouchmove?: Function
  bindtouchend?: Function
  bindtouchcancel?: Function
  bindlongtap?: Function
  binderror?: Function
}
