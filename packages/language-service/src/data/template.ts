import type * as html from 'vscode-html-languageservice'
import { MpxDocs, MpxDocsUrl, WxDocs, WxDocsUrl } from './utils'

const MpxGuideUrl = `${MpxDocsUrl}/guide`
const MpxDirectivesUrl = `${MpxDocsUrl}/api/directives.html#`
const MpxRNCompUrl = `${MpxGuideUrl}/platform/rn.html#`
const WxCompUrl = `${WxDocsUrl}/component`
const RNBasicComp = '跨端输出 RN'

const data: html.HTMLDataV1 = {
  version: 1.1,
  tags: [
    {
      name: 'template',
      description: {
        kind: 'markdown',
        value: '',
      },
      attributes: [
        {
          name: 'is',
          description: {
            kind: 'markdown',
            value:
              '指定要使用的模板名称，可以是一个字符串或一个表达式。\n\n- **注意**：如果是字符串，则必须与 `name` 属性的值相同；如果是表达式，则必须返回一个字符串。',
          },
        },
        {
          name: 'name',
          description: {
            kind: 'markdown',
            value: '定义模版的名称，作为唯一标识。',
          },
        },
        {
          name: 'data',
          description: {
            kind: 'markdown',
            value:
              '定义模版的初始数据，类型为对象。可以在模版中使用 `{{data.xxx}}` 来访问这些数据。',
          },
        },
      ],
      references: [
        { name: MpxDocs, url: `${MpxGuideUrl}/basic/template.html` },
      ],
    },
    {
      name: 'view',
      description: {
        kind: 'markdown',
        value: `视图容器。\n\n- **注意**：如果需要使用滚动视图，请使用 [scroll-view](${WxCompUrl}/scroll-view.html)。\n\n- 支持 Mpx 跨端输出 RN 的基础组件。`,
      },
      attributes: [
        {
          name: 'hover-class',
          description: {
            kind: 'markdown',
            value:
              '指定按下去的样式类。当 hover-class="none" 时，没有点击态效果',
          },
        },
        {
          name: 'hover-stop-propagation',
          description: {
            kind: 'markdown',
            value: '指定是否阻止本节点的祖先节点的点击事件。',
          },
        },
        {
          name: 'hover-start-time',
          description: {
            kind: 'markdown',
            value: '按住后多久出现点击态，单位毫秒，默认50ms。',
          },
        },
        {
          name: 'hover-stay-time',
          description: {
            kind: 'markdown',
            value: '手指松开后点击态保留时间，单位毫秒，默认400ms。',
          },
        },
      ],
      references: [
        { name: WxDocs, url: `${WxCompUrl}/view.html` },
        { name: RNBasicComp, url: `${MpxRNCompUrl}view` },
      ],
    },
    {
      name: 'scroll-view',
      description: {
        kind: 'markdown',
        value: `可滚动视图区域。\n\n- 支持 Mpx 跨端输出 RN 的基础组件。`,
      },
      attributes: [
        {
          name: 'scroll-x',
          description: {
            kind: 'markdown',
            value: '是否支持横向滚动，默认不支持。',
          },
        },
        {
          name: 'scroll-y',
          description: {
            kind: 'markdown',
            value: '是否支持纵向滚动，默认不支持。',
          },
        },
        {
          name: 'upper-threshold',
          description: {
            kind: 'markdown',
            value:
              '距离顶部/左边多远时（单位 px）触发scrolltoupper事件，默认50。',
          },
        },
        {
          name: 'lower-threshold',
          description: {
            kind: 'markdown',
            value:
              '距离底部/右边多远时（单位 px）触发scrolltolower事件，默认50。',
          },
        },
        {
          name: 'scroll-top',
          description: {
            kind: 'markdown',
            value: '设置竖向滚动条位置。',
          },
        },
        {
          name: 'scroll-left',
          description: {
            kind: 'markdown',
            value: '设置横向滚动条位置。',
          },
        },
        {
          name: 'scroll-into-view',
          description: {
            kind: 'markdown',
            value:
              '值应为某子元素id（id不能以数字开头）。设置哪个方向可滚动，则在哪个方向滚动到该元素。',
          },
        },
        {
          name: 'scroll-into-view-offset',
          description: {
            kind: 'markdown',
            value: '跳转到scroll-into-view目标节点时的额外偏移,默认值为0。',
          },
        },
        {
          name: 'scroll-with-animation',
          description: {
            kind: 'markdown',
            value: '是否在设置滚动条位置时使用动画过渡，默认不使用。',
          },
        },
        {
          name: 'enable-back-to-top',
          description: {
            kind: 'markdown',
            value:
              'iOS点击顶部状态栏、安卓双击标题栏时，滚动条返回顶部，只支持竖向，默认不使用。',
          },
        },
        {
          name: 'enable-passive',
          description: {
            kind: 'markdown',
            value: '开启passive特性，能优化一定的滚动性能。',
          },
        },
        {
          name: 'refresher-enabled',
          description: {
            kind: 'markdown',
            value: '是否开启下拉刷新功能，默认不使用。',
          },
        },
        {
          name: 'refresher-threshold',
          description: {
            kind: 'markdown',
            value: '设置自定义下拉刷新阈值，默认45。',
          },
        },
        {
          name: 'refresher-default-style',
          description: {
            kind: 'markdown',
            value:
              '设置自定义下拉刷新默认样式，支持设置 black | white | none， none 表示不使用默认样式.',
          },
        },
        {
          name: 'refresher-background',
          description: {
            kind: 'markdown',
            value: '设置自定义下拉刷新区域背景颜色，默认为透明。',
          },
        },
        {
          name: 'refresher-triggered',
          description: {
            kind: 'markdown',
            value:
              '设置当前下拉刷新状态，true 表示下拉刷新已经被触发，false 表示下拉刷新未被触发.',
          },
        },
        {
          name: 'bounces',
          description: {
            kind: 'markdown',
            value:
              'iOS 下 scroll-view 边界弹性控制 (同时开启 enhanced 属性后生效)。',
          },
        },
        {
          name: 'show-scrollbar',
          description: {
            kind: 'markdown',
            value: '滚动条显隐控制 (同时开启 enhanced 属性后生效)。',
          },
        },
        {
          name: 'fast-deceleration',
          description: {
            kind: 'markdown',
            value:
              '滑动减速速率控制, 仅在 iOS 下生效 (同时开启 enhanced 属性后生效)。',
          },
        },
        {
          name: 'binddragstart',
          description: {
            kind: 'markdown',
            value:
              '滑动开始事件 (同时开启 enhanced 属性后生效) detail { scrollTop, scrollLeft }。',
          },
        },
        {
          name: 'binddragging',
          description: {
            kind: 'markdown',
            value:
              '滑动事件 (同时开启 enhanced 属性后生效) detail { scrollTop, scrollLeft }。',
          },
        },
        {
          name: 'binddragend',
          description: {
            kind: 'markdown',
            value:
              '滑动结束事件 (同时开启 enhanced 属性后生效) detail { scrollTop, scrollLeft, velocity }。',
          },
        },
        {
          name: 'bindscrolltoupper',
          description: {
            kind: 'markdown',
            value: '滚动到顶部/左边时触发。',
          },
        },
        {
          name: 'bindscrolltolower',
          description: {
            kind: 'markdown',
            value: '滚动到底部/右边时触发。',
          },
        },
        {
          name: 'bindscroll',
          description: {
            kind: 'markdown',
            value:
              '滚动时触发，event.detail = { scrollLeft, scrollTop, scrollHeight, scrollWidth, deltaX, deltaY }。',
          },
        },
        {
          name: 'bindrefresherpulling',
          description: {
            kind: 'markdown',
            value: '自定义下拉刷新控件被下拉。',
          },
        },
        {
          name: 'bindrefresherrefresh',
          description: {
            kind: 'markdown',
            value: '自定义下拉刷新控件被触发。',
          },
        },
        {
          name: 'bindrefresherrestore',
          description: {
            kind: 'markdown',
            value: '自定义下拉刷新控件被恢复。',
          },
        },
        {
          name: 'bindrefresherabort',
          description: {
            kind: 'markdown',
            value: '自定义下拉刷新控件被中止。',
          },
        },
        {
          name: 'scroll-anchoring',
          description: {
            kind: 'markdown',
            value:
              '开启 scroll anchoring 特性，即控制滚动位置不随内容变化而抖动，可参考 CSS overflow-anchor 属性。',
          },
        },
      ],
      references: [
        { name: WxDocs, url: `${WxCompUrl}/scroll-view.html` },
        {
          name: RNBasicComp,
          url: `${MpxRNCompUrl}scroll-view`,
        },
      ],
    },
    {
      name: 'swiper',
      description: {
        kind: 'markdown',
        value: `滑块视图容器。\n\n- **注意**：其中只可放置 swiper-item 组件，否则会导致未定义的行为。`,
      },
      attributes: [
        {
          name: 'indicator-dots',
          description: {
            kind: 'markdown',
            value: '是否显示面板指示点。',
          },
        },
        {
          name: 'indicator-color',
          description: {
            kind: 'markdown',
            value: '指示点颜色。',
          },
        },
        {
          name: 'indicator-active-color',
          description: {
            kind: 'markdown',
            value: '当前选中的指示点颜色。',
          },
        },
        {
          name: 'autoplay',
          description: {
            kind: 'markdown',
            value: '是否自动切换，默认不自动切换。',
          },
        },
        {
          name: 'current',
          description: {
            kind: 'markdown',
            value: '当前所在滑块的 index，默认0。',
          },
        },
        {
          name: 'interval',
          description: {
            kind: 'markdown',
            value: '自动切换时间间隔，单位 ms，默认5000。',
          },
        },
        {
          name: 'duration',
          description: {
            kind: 'markdown',
            value: '滑动动画时长，单位 ms，默认500。',
          },
        },
        {
          name: 'circular',
          description: {
            kind: 'markdown',
            value: '是否采用衔接滑动，默认不衔接。',
          },
        },
        {
          name: 'vertical',
          description: {
            kind: 'markdown',
            value: '滑动方向是否为纵向。',
          },
        },
        {
          name: 'display-multiple-items',
          description: {
            kind: 'markdown',
            value: '同时显示的滑块数量，默认为1。',
          },
        },
        {
          name: 'previous-margin',
          description: {
            kind: 'markdown',
            value: '前边距，可用于露出前一项的一小部分，接受 px 和 rpx 值。',
          },
        },
        {
          name: 'next-margin',
          description: {
            kind: 'markdown',
            value: '后边距，可用于露出后一项的一小部分，接受 px 和 rpx 值。',
          },
        },
        {
          name: 'easing-function',
          description: {
            kind: 'markdown',
            value: '指定 swiper 切换缓动动画类型。',
          },
        },
        {
          name: 'direction',
          description: {
            kind: 'markdown',
            value: '指定 swiper 切换方向。',
          },
        },
        {
          name: 'bindchange',
          description: {
            kind: 'markdown',
            value:
              'current 改变时会触发 change 事件，event.detail = {current, source}。',
          },
        },
        {
          name: 'bindtransition',
          description: {
            kind: 'markdown',
            value:
              'swiper-item 的位置发生改变时会触发 transition 事件，event.detail = {dx: dx, dy: dy}。',
          },
        },
        {
          name: 'bindanimationfinish',
          description: {
            kind: 'markdown',
            value:
              'swiper-item 动画结束时会触发 animationfinish 事件，event.detail = {current, source}。',
          },
        },
      ],
      references: [
        { name: WxDocs, url: `${WxCompUrl}/swiper.html` },
        {
          name: RNBasicComp,
          url: `${MpxRNCompUrl}swiper`,
        },
      ],
    },
    {
      name: 'swiper-item',
      description: {
        kind: 'markdown',
        value: `滑块视图容器子元素。\n\n- **注意**：仅可放置在 swiper 组件中，宽高自动设置为 100%。`,
      },
      attributes: [
        {
          name: 'item-id',
          description: {
            kind: 'markdown',
            value: '设置当前 swiper-item 的标识符，必须是唯一的。',
          },
        },
        {
          name: 'skip-hidden-item-layout',
          description: {
            kind: 'markdown',
            value: '是否跳过隐藏的 swiper-item 布局计算，默认不跳过。',
          },
        },
      ],
      references: [
        { name: WxDocs, url: `${WxCompUrl}/swiper-item.html` },
        {
          name: RNBasicComp,
          url: `${MpxRNCompUrl}swiper-item`,
        },
      ],
    },
    {
      name: 'movable-area',
      description: {
        kind: 'markdown',
        value: `[movable-view](${WxCompUrl}/movable-view.html) 的可移动区域。\n\n- **注意**：movable-area 不支持设置 scale-area`,
      },
      attributes: [
        {
          name: 'scale-area',
          description: {
            kind: 'markdown',
            value: '是否开启缩放区域，默认不开启。',
          },
        },
      ],
      references: [
        { name: WxDocs, url: `${WxCompUrl}/movable-area.html` },
        {
          name: RNBasicComp,
          url: `${MpxRNCompUrl}movable-area`,
        },
      ],
    },
    {
      name: 'movable-view',
      description: {
        kind: 'markdown',
        value: `可移动的视图容器，在页面中可以拖拽滑动。\n\n- **注意**：movable-view 必须在 [movable-area](${WxCompUrl}/movable-area.html) 组件中，并且必须是直接子节点，否则不能移动。`,
      },
      attributes: [
        {
          name: 'direction',
          description: {
            kind: 'markdown',
            value:
              'movable-view的移动方向，属性值有all、vertical、horizontal、none。',
          },
        },
        {
          name: 'inertia',
          description: {
            kind: 'markdown',
            value: 'movable-view 是否带有惯性。',
          },
        },
        {
          name: 'out-of-bounds',
          description: {
            kind: 'markdown',
            value: '超过可移动区域后，movable-view是否还可以移动，默认不允许。',
          },
        },
        {
          name: 'x',
          description: {
            kind: 'markdown',
            value:
              '定义x轴方向的偏移，如果x的值不在可移动范围内，会自动移动到可移动范围；改变x的值会触发动画；单位支持px（默认）、rpx。',
          },
        },
        {
          name: 'y',
          description: {
            kind: 'markdown',
            value:
              '定义y轴方向的偏移，如果y的值不在可移动范围内，会自动移动到可移动范围；改变y的值会触发动画；单位支持px（默认）、rpx。',
          },
        },
        {
          name: 'damping',
          description: {
            kind: 'markdown',
            value:
              '阻尼系数，用于控制x或y改变时的动画和过界回弹的动画，值越大移动越快。',
          },
        },
        {
          name: 'friction',
          description: {
            kind: 'markdown',
            value:
              '摩擦系数，用于控制惯性滑动的动画，值越大摩擦力越大，滑动越快停止；必须大于0，否则会被设置成默认值。',
          },
        },
        {
          name: 'disabled',
          description: {
            kind: 'markdown',
            value: '是否禁用movable-view，默认不禁用。',
          },
        },
        {
          name: 'scale',
          description: {
            kind: 'markdown',
            value: '是否支持双指缩放，默认缩放手势生效区域是在movable-view内。',
          },
        },
        {
          name: 'scale-min',
          description: {
            kind: 'markdown',
            value: '定义缩放倍数最小值。',
          },
        },
        {
          name: 'scale-max',
          description: {
            kind: 'markdown',
            value: '定义缩放倍数最大值。',
          },
        },
        {
          name: 'scale-value',
          description: {
            kind: 'markdown',
            value: '定义缩放倍数，取值范围为 0.1 - 10。',
          },
        },
        {
          name: 'animation',
          description: {
            kind: 'markdown',
            value: '是否使用动画。',
          },
        },
        {
          name: 'bindchange',
          description: {
            kind: 'markdown',
            value:
              '当 movable-view 的位置发生改变时触发，event.detail = {x, y, source}。',
          },
        },
        {
          name: 'bindscale',
          description: {
            kind: 'markdown',
            value: '缩放过程中触发，event.detail = {scale, x, y}。',
          },
        },
        {
          name: 'htouchmove',
          description: {
            kind: 'markdown',
            value: '水平方向触摸移动时触发。',
          },
        },
        {
          name: 'vtouchmove',
          description: {
            kind: 'markdown',
            value: '垂直方向触摸移动时触发。',
          },
        },
      ],
      references: [
        { name: WxDocs, url: `${WxCompUrl}/movable-view.html` },
        {
          name: RNBasicComp,
          url: `${MpxRNCompUrl}movable-view`,
        },
      ],
    },
    {
      name: 'root-portal',
      description: {
        kind: 'markdown',
        value:
          '使整个子树从页面中脱离出来，类似于在 CSS 中使用 fixed position 的效果。主要用于制作弹窗、弹出层等。',
      },
      attributes: [
        {
          name: 'enable',
          description: {
            kind: 'markdown',
            value:
              '是否启用传送门功能，启用后组件内容将渲染在应用的最顶层。\n\n- **类型**：`boolean`\n- **默认值**：`false`',
          },
        },
      ],
      references: [
        { name: WxDocs, url: `${WxCompUrl}/root-portal.html` },
        {
          name: RNBasicComp,
          url: `${MpxRNCompUrl}root-portal`,
        },
      ],
    },
    {
      name: 'cover-view',
      description: {
        kind: 'markdown',
        value:
          '覆盖在原生组件之上的文本视图。功能同 view 组件。\n\n- **注意**：目前微信原生组件均已支持同层渲染，建议使用 view 替代。（详见微信文档）',
      },
      attributes: [
        {
          name: 'scroll-top',
          description: {
            kind: 'markdown',
            value:
              '设置顶部滚动偏移量，仅在设置了 overflow-y: scroll 成为滚动元素后生效。\n\n- **类型**：`number | string`\n- **说明**：如果设置为字符串，会尝试转换为数字；若转换失败则无效。',
          },
        },
      ],
      references: [
        { name: WxDocs, url: `${WxCompUrl}/cover-view.html` },
        {
          name: RNBasicComp,
          url: `${MpxRNCompUrl}cover-view`,
        },
      ],
    },
    {
      name: 'icon',
      description: {
        kind: 'markdown',
        value: '图标组件。',
      },
      attributes: [
        {
          name: 'type',
          description: {
            kind: 'markdown',
            value:
              '图标的类型。可选值包括：\n- success\n- success_no_circle\n- info\n- warn\n- waiting\n- cancel\n- download\n- search\n- clear',
          },
        },
        {
          name: 'size',
          description: {
            kind: 'markdown',
            value:
              '图标的大小。\n\n- **类型**：`number | string`\n- **默认值**：23。',
          },
        },
        {
          name: 'color',
          description: {
            kind: 'markdown',
            value: '图标的颜色，同 CSS 的 color。',
          },
        },
      ],
      references: [
        { name: WxDocs, url: `${WxCompUrl}/icon.html` },
        {
          name: RNBasicComp,
          url: `${MpxRNCompUrl}icon`,
        },
      ],
    },
    {
      name: 'text',
      description: {
        kind: 'markdown',
        value: '文本组件。',
      },
      attributes: [
        {
          name: 'selectable',
          description: {
            kind: 'markdown',
            value:
              '文本是否可选，影响长按复制等功能。\n\n- **类型**：`boolean`\n- **默认值**：`false`\n- **注意**：已废弃。',
          },
        },
        {
          name: 'user-select',
          description: {
            kind: 'markdown',
            value:
              '是否允许用户选中文字。\n\n- **类型**：`boolean`\n- **默认值**：`false`',
          },
        },
      ],
      references: [
        { name: WxDocs, url: `${WxCompUrl}/text.html` },
        {
          name: RNBasicComp,
          url: `${MpxRNCompUrl}text`,
        },
      ],
    },
    {
      name: 'button',
      description: {
        kind: 'markdown',
        value: '按钮组件。',
      },
      attributes: [
        {
          name: 'size',
          description: {
            kind: 'markdown',
            value:
              '按钮的大小。\n\n- **可选值**：`default`（默认）、`mini`（小尺寸）',
          },
        },
        {
          name: 'type',
          description: {
            kind: 'markdown',
            value:
              '按钮的样式类型。\n\n- **可选值**：`primary`（绿色）、`default`（白色）、`warn`（红色）',
          },
        },
        {
          name: 'plain',
          description: {
            kind: 'markdown',
            value:
              '按钮是否镂空，背景色透明。\n\n- **类型**：`boolean`\n- **默认值**：`false`',
          },
        },
        {
          name: 'disabled',
          description: {
            kind: 'markdown',
            value:
              '是否禁用按钮。\n\n- **类型**：`boolean`\n- **默认值**：`false`',
          },
        },
        {
          name: 'loading',
          description: {
            kind: 'markdown',
            value:
              '名称前是否带 loading 图标。\n\n- **类型**：`boolean`\n- **默认值**：`false`',
          },
        },
        {
          name: 'form-type',
          description: {
            kind: 'markdown',
            value:
              '用于 `<form>` 组件，点击分别会触发 `<form>` 组件的 submit/reset 事件。\n\n- **可选值**：`submit`、`reset`、`submitToGroup`',
          },
        },
        {
          name: 'open-type',
          description: {
            kind: 'markdown',
            value:
              '微信开放能力，用于调用微信提供的各种功能。\n\n- **可选值**：\n  - `contact`（打开客服会话）\n  - `share`（触发分享）\n  - `getUserInfo`（获取用户信息）\n  - `launchApp`（打开APP）\n  - `openSetting`（打开授权设置页）\n  - `feedback`（打开意见反馈）\n  - `getPhoneNumber`（获取用户手机号）\n  - `getRealnameAuthInfo`（获取实名认证信息）',
          },
        },
        {
          name: 'hover-class',
          description: {
            kind: 'markdown',
            value:
              '指定按钮按下去的样式类。当 `hover-class="none"` 时，没有点击态效果。',
          },
        },
        {
          name: 'hover-stop-propagation',
          description: {
            kind: 'markdown',
            value:
              '指定是否阻止本节点的祖先节点出现点击态。\n\n- **类型**：`boolean`\n- **默认值**：`false`',
          },
        },
        {
          name: 'hover-start-time',
          description: {
            kind: 'markdown',
            value: '按住后多久出现点击态，单位为毫秒。\n\n- **默认值**：`20`',
          },
        },
        {
          name: 'hover-stay-time',
          description: {
            kind: 'markdown',
            value:
              '手指松开后点击态保留时间，单位为毫秒。\n\n- **默认值**：`70`',
          },
        },
        {
          name: 'lang',
          description: {
            kind: 'markdown',
            value:
              '指定返回用户信息的语言。\n\n- **可选值**：`zh_CN`（简体中文）、`zh_TW`（繁体中文）、`en`（英文）',
          },
        },
        {
          name: 'session-from',
          description: {
            kind: 'markdown',
            value: '会话来源，`open-type="contact"` 时有效。',
          },
        },
        {
          name: 'send-message-title',
          description: {
            kind: 'markdown',
            value: '会话内消息卡片标题，`open-type="contact"` 时有效。',
          },
        },
        {
          name: 'send-message-path',
          description: {
            kind: 'markdown',
            value:
              '会话内消息卡片点击跳转小程序路径，`open-type="contact"` 时有效。',
          },
        },
        {
          name: 'send-message-img',
          description: {
            kind: 'markdown',
            value: '会话内消息卡片图片，`open-type="contact"` 时有效。',
          },
        },
        {
          name: 'app-parameter',
          description: {
            kind: 'markdown',
            value:
              '打开 APP 时，向 APP 传递的参数，`open-type="launchApp"` 时有效。',
          },
        },
        {
          name: 'show-message-card',
          description: {
            kind: 'markdown',
            value:
              '是否显示会话内消息卡片，设置此参数为 true，用户进入客服会话会在右下角显示"可能要发送的小程序"提示，用户点击后可以快速发送小程序消息，`open-type="contact"` 时有效。',
          },
        },
        {
          name: 'phone-number-no-quota-toast',
          description: {
            kind: 'markdown',
            value:
              '当手机号快速验证或手机号实时验证额度用尽时，是否对用户展示“申请获取你的手机号，但该功能使用次数已达当前小程序上限，暂时无法使用”的提示，默认展示，open-type="getPhoneNumber" 或 open-type="getRealtimePhoneNumber" 时有效。\n\n- **类型**：`boolean`\n- **默认值**：`true`',
          },
        },
        {
          name: 'need-show-entrance',
          description: {
            kind: 'markdown',
            value:
              '转发的文本消息是否要带小程序入口。\n\n- **类型**：`boolean`\n- **默认值**：`false`',
          },
        },
        {
          name: 'entrance-path',
          description: {
            kind: 'markdown',
            value: '从消息小程序入口打开小程序的路径，默认为聊天工具启动路径。',
          },
        },
        {
          name: 'bindgetuserinfo',
          description: {
            kind: 'markdown',
            value:
              '用户点击该按钮时，会返回获取到的用户信息，回调的detail数据与wx.getUserInfo返回的一致，open-type="getUserInfo"时有效。',
          },
        },
        {
          name: 'bindcontact',
          description: {
            kind: 'markdown',
            value: '客服消息回调，`open-type="contact"` 时有效。',
          },
        },
        {
          name: 'createliveactivity',
          description: {
            kind: 'markdown',
            value:
              '新的一次性订阅消息下发机制回调，`open-type="liveActivity"` 时有效。',
          },
        },
        {
          name: 'bindgetphonenumber',
          description: {
            kind: 'markdown',
            value: '获取用户手机号回调，`open-type="getPhoneNumber"` 时有效。',
          },
        },
        {
          name: 'bindgetrealtimephonenumber',
          description: {
            kind: 'markdown',
            value:
              '获取用户实时手机号回调，`open-type="getRealTimePhoneNumber"` 时有效。',
          },
        },
        {
          name: 'binderror',
          description: {
            kind: 'markdown',
            value:
              '当使用开放能力时，发生错误的回调，open-type=launchApp时有效。',
          },
        },
        {
          name: 'bindopensetting',
          description: {
            kind: 'markdown',
            value: '打开授权设置页回调，`open-type="openSetting"` 时有效。',
          },
        },
        {
          name: 'bindlaunchapp',
          description: {
            kind: 'markdown',
            value: '打开 APP 成功的回调，`open-type="launchApp"` 时有效。',
          },
        },
        {
          name: 'bindchooseavatar',
          description: {
            kind: 'markdown',
            value: '获取用户头像回调，`open-type="chooseAvatar"` 时有效。',
          },
        },
        {
          name: 'bindagreeprivacyauthorization',
          description: {
            kind: 'markdown',
            value:
              '同意隐私授权回调，`open-type="agreePrivacyAuthorization"` 时有效。',
          },
        },
      ],
      references: [
        { name: WxDocs, url: `${WxCompUrl}/button.html` },
        {
          name: RNBasicComp,
          url: `${MpxRNCompUrl}button`,
        },
      ],
    },
    {
      name: 'label',
      description: {
        kind: 'markdown',
        value: '用来改进表单组件的可用性。',
      },
      attributes: [
        {
          name: 'for',
          description: {
            kind: 'markdown',
            value: '指定关联的表单元素的 ID。\n\n- **类型**：`string`',
          },
        },
      ],
      references: [
        { name: WxDocs, url: `${WxCompUrl}/label.html` },
        {
          name: RNBasicComp,
          url: `${MpxRNCompUrl}label`,
        },
      ],
    },
    {
      name: 'checkbox',
      description: {
        kind: 'markdown',
        value: '多选项目。',
      },
      attributes: [
        {
          name: 'value',
          description: {
            kind: 'markdown',
            value:
              'checkbox 标识，选中时触发 checkbox-group 的 change 事件，并携带 checkbox 的 value。',
          },
        },
        {
          name: 'disabled',
          description: {
            kind: 'markdown',
            value:
              '是否禁用多选框。\n\n- **类型**：`boolean`\n- **默认值**：`false`',
          },
        },
        {
          name: 'checked',
          description: {
            kind: 'markdown',
            value:
              '初始时是否选中。\n\n- **类型**：`boolean`\n- **默认值**：`false`',
          },
        },
        {
          name: 'color',
          description: {
            kind: 'markdown',
            value: '多选框的颜色，同 CSS 的 color。',
          },
        },
      ],
      references: [
        { name: WxDocs, url: `${WxCompUrl}/checkbox.html` },
        {
          name: RNBasicComp,
          url: `${MpxRNCompUrl}checkbox`,
        },
      ],
    },
    {
      name: 'checkbox-group',
      description: {
        kind: 'markdown',
        value: '多项选择器，内部由多个checkbox组成。',
      },
      attributes: [
        {
          name: 'bindchange',
          description: {
            kind: 'markdown',
            value:
              'checkbox-group 中选中项发生改变时触发 change 事件，detail = {value:[选中的checkbox的value的数组]}。',
          },
        },
      ],
      references: [
        { name: WxDocs, url: `${WxCompUrl}/checkbox-group.html` },
        {
          name: RNBasicComp,
          url: `${MpxRNCompUrl}checkbox-group`,
        },
      ],
    },
    {
      name: 'radio',
      description: {
        kind: 'markdown',
        value: '单选项目。',
      },
      attributes: [
        {
          name: 'value',
          description: {
            kind: 'markdown',
            value:
              '	radio 标识。当该 radio 选中时，radio-group 的 change 事件会携带 radio 的 value。',
          },
        },
        {
          name: 'checked',
          description: {
            kind: 'markdown',
            value:
              '初始时是否选中。\n\n- **类型**：`boolean`\n- **默认值**：`false`',
          },
        },
        {
          name: 'disabled',
          description: {
            kind: 'markdown',
            value:
              '是否禁用单选框。\n\n- **类型**：`boolean`\n- **默认值**：`false`',
          },
        },
        {
          name: 'color',
          description: {
            kind: 'markdown',
            value: '单选框的颜色，同 CSS 的 color。',
          },
        },
      ],
      references: [
        { name: WxDocs, url: `${WxCompUrl}/radio.html` },
        {
          name: RNBasicComp,
          url: `${MpxRNCompUrl}radio`,
        },
      ],
    },
    {
      name: 'radio-group',
      description: {
        kind: 'markdown',
        value: '单项选择器，内部由多个 radio 组成。',
      },
      attributes: [
        {
          name: 'bindchange',
          description: {
            kind: 'markdown',
            value:
              'radio-group 中选中项发生改变时触发 change 事件，detail = {value:[选中的radio的value的数组]}。',
          },
        },
      ],
      references: [
        { name: WxDocs, url: `${WxCompUrl}/radio-group.html` },
        {
          name: RNBasicComp,
          url: `${MpxRNCompUrl}radio-group`,
        },
      ],
    },
    {
      name: 'form',
      description: {
        kind: 'markdown',
        value: '表单组件。',
      },
      attributes: [
        {
          name: 'report-submit',
          description: {
            kind: 'markdown',
            value:
              '是否在表单提交时报告相关数据（如formId、字段值等），用于数据分析。\n\n- **类型**：`boolean`\n- **默认值**：`false`',
          },
        },
        {
          name: 'report-submit-timeout',
          description: {
            kind: 'markdown',
            value:
              '等待一段时间（毫秒数）以确认 formId 是否生效。如果未指定这个参数，formId 有很小的概率是无效的（如遇到网络失败的情况）。指定这个参数将可以检测 formId 是否有效，以这个参数的时间作为这项检测的超时时间。如果失败，将返回 requestFormId:fail 开头的 formId。',
          },
        },
        {
          name: 'bindsubmit',
          description: {
            kind: 'markdown',
            value:
              '携带 form 中的数据触发 submit 事件，event.detail = {value : {"name": "value"} , formId: ""}。',
          },
        },
        {
          name: 'bindreset',
          description: {
            kind: 'markdown',
            value:
              '当表单重置时触发的事件（如点击 `<button form-type="reset">`）。',
          },
        },
        {
          name: 'bindsubmitToGroup',
          description: {
            kind: 'markdown',
            value: '用户发送文本到聊天后触发，但不代表最终发送成功。',
          },
        },
      ],
      references: [
        { name: WxDocs, url: `${WxCompUrl}/form.html` },
        {
          name: RNBasicComp,
          url: `${MpxRNCompUrl}form`,
        },
      ],
    },
    {
      name: 'input',
      description: {
        kind: 'markdown',
        value: '输入框组件。',
      },
      attributes: [
        {
          name: 'value',
          description: {
            kind: 'markdown',
            value: '输入框的初始内容。',
          },
        },
        {
          name: 'type',
          description: {
            kind: 'markdown',
            value:
              '输入框的类型。\n\n- **可选值**：\n  - `text`（普通文本，默认值）\n  - `number`（数字键盘）\n  - `idcard`（身份证键盘）\n  - `digit`（带小数点的数字键盘）\n  - `safe-password`（密码安全输入键盘）\n  - `nickname`（昵称输入键盘）',
          },
        },
        {
          name: 'password',
          description: {
            kind: 'markdown',
            value:
              '是否是密码类型。\n\n- **类型**：`boolean`\n- **默认值**：`false`',
          },
        },
        {
          name: 'placeholder',
          description: {
            kind: 'markdown',
            value: '输入框为空时的占位符文本。',
          },
        },
        {
          name: 'placeholder-style',
          description: {
            kind: 'markdown',
            value: '占位符的样式，支持 CSS 样式字符串。',
          },
        },
        {
          name: 'disabled',
          description: {
            kind: 'markdown',
            value:
              '是否禁用输入框。\n\n- **类型**：`boolean`\n- **默认值**：`false`',
          },
        },
        {
          name: 'maxlength',
          description: {
            kind: 'markdown',
            value:
              '最大输入长度，设置为 `-1` 时不限制最大长度。\n\n- **类型**：`number`\n- **默认值**：`140`',
          },
        },
        {
          name: 'cursor-spacing',
          description: {
            kind: 'markdown',
            value:
              '指定光标与键盘的距离，取 input 距离底部的距离和 cursor-spacing 指定的距离的最小值作为光标与键盘的距离。',
          },
        },
        {
          name: 'auto-focus',
          description: {
            kind: 'markdown',
            value:
              '自动聚焦，拉起键盘。\n\n- **类型**：`boolean`\n- **默认值**：`false`',
          },
        },
        {
          name: 'focus',
          description: {
            kind: 'markdown',
            value: '获取焦点。\n\n- **类型**：`boolean`\n- **默认值**：`false`',
          },
        },
        {
          name: 'confirm-type',
          description: {
            kind: 'markdown',
            value:
              '设置键盘右下角按钮的文字，仅在 `type="text"` 时生效。\n\n- **可选值**：\n  - `done`（完成）\n  - `go`（前往）\n  - `next`（下一项）\n  - `search`（搜索）\n  - `send`（发送）',
          },
        },
        {
          name: 'always-embed',
          description: {
            kind: 'markdown',
            value:
              '强制 input 处于同层状态，默认 focus 时 input 会切到非同层状态 (仅在 iOS 下生效)',
          },
        },
        {
          name: 'confirm-hold',
          description: {
            kind: 'markdown',
            value:
              '点击键盘右下角按钮时是否保持键盘不收起。\n\n- **类型**：`boolean`\n- **默认值**：`false`',
          },
        },
        {
          name: 'cursor',
          description: {
            kind: 'markdown',
            value: '指定 `focus` 时的光标位置。',
          },
        },
        {
          name: 'cursor-color',
          description: {
            kind: 'markdown',
            value:
              '光标颜色。iOS 下的格式为十六进制颜色值，安卓下的只支持 default 和 green，Skyline 下无限制。',
          },
        },
        {
          name: 'selection-start',
          description: {
            kind: 'markdown',
            value:
              '光标起始位置，自动聚焦时有效，需与 `selection-end` 搭配使用。\n\n- **类型**：`number`\n- **默认值**：`-1`',
          },
        },
        {
          name: 'selection-end',
          description: {
            kind: 'markdown',
            value:
              '光标结束位置，自动聚焦时有效，需与 `selection-start` 搭配使用。\n\n- **类型**：`number`\n- **默认值**：`-1`',
          },
        },
        {
          name: 'adjust-position',
          description: {
            kind: 'markdown',
            value:
              '键盘弹起时，是否自动上推页面。\n\n- **类型**：`boolean`\n- **默认值**：`true`',
          },
        },
        {
          name: 'hold-keyboard',
          description: {
            kind: 'markdown',
            value:
              '`focus` 时，点击页面的时候不收起键盘。\n\n- **类型**：`boolean`\n- **默认值**：`false`',
          },
        },
        {
          name: 'safe-password-cert-path',
          description: {
            kind: 'markdown',
            value:
              '安全键盘加密公钥的路径，只支持包内路径。\n\n- **注意**：鸿蒙 OS 暂不支持。\n- **版本支持**：2.18.0+',
          },
        },
        {
          name: 'safe-password-length',
          description: {
            kind: 'markdown',
            value:
              '安全键盘输入密码长度。\n\n- **类型**：`number`\n- **注意**：鸿蒙 OS 暂不支持。\n- **版本支持**：2.18.0+',
          },
        },
        {
          name: 'safe-password-time-stamp',
          description: {
            kind: 'markdown',
            value:
              '安全键盘加密时间戳。\n\n- **类型**：`number`\n- **注意**：鸿蒙 OS 暂不支持。\n- **版本支持**：2.18.0+',
          },
        },
        {
          name: 'safe-password-nonce',
          description: {
            kind: 'markdown',
            value:
              '安全键盘加密盐值。\n\n- **注意**：鸿蒙 OS 暂不支持。\n- **版本支持**：2.18.0+',
          },
        },
        {
          name: 'safe-password-salt',
          description: {
            kind: 'markdown',
            value:
              '安全键盘计算hash盐值，若指定custom-hash则无效。\n\n- **注意**：鸿蒙 OS 暂不支持。\n- **版本支持**：2.18.0+',
          },
        },
        {
          name: 'safe-password-custom-hash',
          description: {
            kind: 'markdown',
            value:
              "安全键盘计算hash的算法表达式，如 `md5(sha1('foo' + sha256(sm3(password + 'bar'))))`。\n\n- **注意**：鸿蒙 OS 暂不支持。\n- **版本支持**：2.18.0+",
          },
        },
        {
          name: 'bindinput',
          description: {
            kind: 'markdown',
            value:
              '当键盘输入时触发的事件。\n\n- **事件对象**：`$event.detail.value` 为当前输入的值。',
          },
        },
        {
          name: 'bindchange',
          description: {
            kind: 'markdown',
            value:
              '键盘非聚焦状态内容改变时触发。event.detail = { value: string }',
          },
        },
        {
          name: 'bindfocus',
          description: {
            kind: 'markdown',
            value:
              '输入框聚焦时触发，event.detail = { value: string, height: number }，height 为键盘高度，在基础库 1.9.90 起支持。',
          },
        },
        {
          name: 'bindblur',
          description: {
            kind: 'markdown',
            value:
              '输入框失去焦点时触发，event.detail = { value: string, encryptedValue?: string, encryptError?: string }。',
          },
        },
        {
          name: 'bindconfirm',
          description: {
            kind: 'markdown',
            value:
              '点击完成按钮时触发，event.detail = { value: string, encryptedValue?: string, encryptError?: string }。',
          },
        },
        {
          name: 'bindkeyboardheightchange',
          description: {
            kind: 'markdown',
            value:
              '键盘高度发生变化的时候触发此事件，event.detail = {height: number, duration: number}。',
          },
        },
        {
          name: 'bindnicknamereview',
          description: {
            kind: 'markdown',
            value:
              '用户昵称审核完毕后触发，仅在 type 为 "nickname" 时有效，event.detail = { pass: boolean, timeout: boolean }',
          },
        },
      ],
      references: [
        { name: WxDocs, url: `${WxCompUrl}/input.html` },
        {
          name: RNBasicComp,
          url: `${MpxRNCompUrl}input`,
        },
      ],
    },
    {
      name: 'textarea',
      description: {
        kind: 'markdown',
        value: '多行文本输入框组件。',
      },
      attributes: [
        {
          name: 'value',
          description: {
            kind: 'markdown',
            value: '输入框的初始内容。',
          },
        },
        {
          name: 'placeholder',
          description: {
            kind: 'markdown',
            value: '输入框为空时的占位符文本。',
          },
        },
        {
          name: 'placeholder-style',
          description: {
            kind: 'markdown',
            value: '占位符的样式，支持 CSS 样式字符串。',
          },
        },
        {
          name: 'placeholder-class',
          description: {
            kind: 'markdown',
            value: '占位符的样式类，需在 WXSS 中定义。',
          },
        },
        {
          name: 'disabled',
          description: {
            kind: 'markdown',
            value:
              '是否禁用输入框。\n\n- **类型**：`boolean`\n- **默认值**：`false`',
          },
        },
        {
          name: 'maxlength',
          description: {
            kind: 'markdown',
            value:
              '最大输入长度，设置为 `-1` 时不限制最大长度。\n\n- **类型**：`number`\n- **默认值**：`140`',
          },
        },
        {
          name: 'auto-focus',
          description: {
            kind: 'markdown',
            value:
              '自动聚焦，拉起键盘。\n\n- **类型**：`boolean`\n- **默认值**：`false`',
          },
        },
        {
          name: 'focus',
          description: {
            kind: 'markdown',
            value: '获取焦点。\n\n- **类型**：`boolean`\n- **默认值**：`false`',
          },
        },
        {
          name: 'auto-height',
          description: {
            kind: 'markdown',
            value:
              '是否自动增高，设置为 `true` 时文本区域高度会随内容增加而增高。\n\n- **类型**：`boolean`\n- **默认值**：`false`',
          },
        },
        {
          name: 'cursor-spacing',
          description: {
            kind: 'markdown',
            value:
              '指定光标与键盘的距离。取 textarea 距离底部的距离和 cursor-spacing 指定的距离的最小值作为光标与键盘的距离。',
          },
        },
        {
          name: 'cursor',
          description: {
            kind: 'markdown',
            value:
              '指定 focus 时的光标位置。\n\n- **类型**：`number`\n- **默认值**：`-1`',
          },
        },
        {
          name: 'selection-start',
          description: {
            kind: 'markdown',
            value:
              '光标起始位置，自动聚焦时有效，需与 `selection-end` 搭配使用。\n\n- **类型**：`number`\n- **默认值**：`-1`',
          },
        },
        {
          name: 'selection-end',
          description: {
            kind: 'markdown',
            value:
              '光标结束位置，自动聚焦时有效，需与 `selection-start` 搭配使用。\n\n- **类型**：`number`\n- **默认值**：`-1`',
          },
        },
        {
          name: 'adjust-position',
          description: {
            kind: 'markdown',
            value:
              '键盘弹起时，是否自动上推页面。\n\n- **类型**：`boolean`\n- **默认值**：`true`',
          },
        },
        {
          name: 'hold-keyboard',
          description: {
            kind: 'markdown',
            value:
              '`focus` 时，点击页面的时候不收起键盘。\n\n- **类型**：`boolean`\n- **默认值**：`false`',
          },
        },
        {
          name: 'disable-default-padding',
          description: {
            kind: 'markdown',
            value:
              '是否去掉 iOS 下的默认内边距。\n\n- **类型**：`boolean`\n- **默认值**：`false`\n- **版本支持**：2.10.0+',
          },
        },
        {
          name: 'confirm-type',
          description: {
            kind: 'markdown',
            value:
              '设置键盘右下角按钮的文字。\n\n- **类型**：`string`\n- **默认值**：`return`\n- **合法值**：\n  - `send`：右下角按钮为“发送”\n  - `search`：右下角按钮为“搜索”\n  - `next`：右下角按钮为“下一个”\n  - `go`：右下角按钮为“前往”\n  - `done`：右下角按钮为“完成”\n  - `return`：右下角按钮为“换行”\n- **版本支持**：2.13.0+',
          },
        },
        {
          name: 'confirm-hold',
          description: {
            kind: 'markdown',
            value:
              '点击键盘右下角按钮时是否保持键盘不收起。\n\n- **类型**：`boolean`\n- **默认值**：`false`\n- **版本支持**：2.16.0+',
          },
        },
        {
          name: 'adjust-keyboard-to',
          description: {
            kind: 'markdown',
            value:
              '键盘对齐位置。\n\n- **类型**：`string`\n- **默认值**：`cursor`\n- **合法值**：\n  - `cursor`：对齐光标位置\n  - `bottom`：对齐输入框底部\n- **版本支持**：2.16.1+',
          },
        },
        {
          name: 'bindinput',
          description: {
            kind: 'markdown',
            value:
              '当键盘输入时，触发 input 事件，event.detail = {value, cursor, keyCode}，keyCode 为键值，目前工具还不支持返回keyCode参数。**bindinput 处理函数的返回值并不会反映到 textarea 上**。',
          },
        },
        {
          name: 'bindfocus',
          description: {
            kind: 'markdown',
            value:
              '输入框聚焦时触发，event.detail = { value, height }，height 为键盘高度。',
          },
        },
        {
          name: 'bindblur',
          description: {
            kind: 'markdown',
            value: '输入框失去焦点时触发，event.detail = {value, cursor}。',
          },
        },
        {
          name: 'bindlinechange',
          description: {
            kind: 'markdown',
            value:
              '输入框行数变化时调用，event.detail = {height: 0, heightRpx: 0, lineCount: 0}。',
          },
        },
        {
          name: 'bindconfirm',
          description: {
            kind: 'markdown',
            value:
              '点击完成时， 触发 confirm 事件，event.detail = {value: value}。',
          },
        },
        {
          name: 'bindkeyboardheightchange',
          description: {
            kind: 'markdown',
            value:
              '键盘高度发生变化时触发的事件。\n\n- **事件对象**：\n  - `$event.detail.height` 为变化后的键盘高度；\n  - `$event.detail.duration` 为变化所用的时间。',
          },
        },
      ],
      references: [
        { name: WxDocs, url: `${WxCompUrl}/textarea.html` },
        {
          name: RNBasicComp,
          url: `${MpxRNCompUrl}textarea`,
        },
      ],
    },
    {
      name: 'picker-view',
      description: {
        kind: 'markdown',
        value: `嵌入页面的滚动选择器。其中只可放置 [picker-view-column](${WxCompUrl}/picker-view-column.html) 组件，其它节点不会显示。`,
      },
      attributes: [],
      references: [
        { name: WxDocs, url: `${WxCompUrl}/picker-view.html` },
        {
          name: RNBasicComp,
          url: `${MpxRNCompUrl}picker-view`,
        },
      ],
    },
    {
      name: 'picker-view-column',
      description: {
        kind: 'markdown',
        value: `滚动选择器子项。仅可放置于 [picker-view](${WxCompUrl}/picker-view.html) 中，其孩子节点的高度会自动设置成与 picker-view 的选中框的高度一致。`,
      },
      attributes: [],
      references: [
        { name: WxDocs, url: `${WxCompUrl}/picker-view-column.html` },
        {
          name: RNBasicComp,
          url: `${MpxRNCompUrl}picker-view-column`,
        },
      ],
    },
    {
      name: 'picker',
      description: {
        kind: 'markdown',
        value: '从底部弹起的滚动选择器。',
      },
      attributes: [],
      references: [
        { name: WxDocs, url: `${WxCompUrl}/picker.html` },
        {
          name: RNBasicComp,
          url: `${MpxRNCompUrl}picker`,
        },
      ],
    },
    {
      name: 'image',
      description: {
        kind: 'markdown',
        value: '图片组件。',
      },
      attributes: [],
      references: [
        { name: WxDocs, url: `${WxCompUrl}/image.html` },
        {
          name: RNBasicComp,
          url: `${MpxRNCompUrl}image`,
        },
      ],
    },
    {
      name: 'switch',
      description: {
        kind: 'markdown',
        value: '开关组件。',
      },
      attributes: [],
      references: [
        { name: WxDocs, url: `${WxCompUrl}/switch.html` },
        {
          name: RNBasicComp,
          url: `${MpxRNCompUrl}switch`,
        },
      ],
    },
    {
      name: 'navigator',
      description: {
        kind: 'markdown',
        value: '页面链接。',
      },
      attributes: [],
      references: [
        { name: WxDocs, url: `${WxCompUrl}/navigator.html` },
        {
          name: RNBasicComp,
          url: `${MpxRNCompUrl}navigator`,
        },
      ],
    },
    {
      name: 'rich-text',
      description: {
        kind: 'markdown',
        value: '富文本组件。',
      },
      attributes: [],
      references: [
        { name: WxDocs, url: `${WxCompUrl}/rich-text.html` },
        {
          name: RNBasicComp,
          url: `${MpxRNCompUrl}rich-text`,
        },
      ],
    },
    {
      name: 'canvas',
      description: {
        kind: 'markdown',
        value: '画布组件。',
      },
      attributes: [],
      references: [
        { name: WxDocs, url: `${WxCompUrl}/canvas.html` },
        {
          name: RNBasicComp,
          url: `${MpxRNCompUrl}canvas`,
        },
      ],
    },
    {
      name: 'web-view',
      description: {
        kind: 'markdown',
        value: '承载网页的容器。会自动铺满整个页面。',
      },
      attributes: [],
      references: [
        { name: WxDocs, url: `${WxCompUrl}/web-view.html` },
        {
          name: RNBasicComp,
          url: `${MpxRNCompUrl}web-view`,
        },
      ],
    },
    {
      name: 'page-container',
      description: {
        kind: 'markdown',
        value: '页面容器。',
      },
      attributes: [],
      references: [{ name: WxDocs, url: `${WxCompUrl}/page-container.html` }],
    },
  ],
  globalAttributes: [
    {
      name: 'wx:if',
      description: {
        kind: 'markdown',
        value:
          '基于表达式值的真假性（[Truthy](https://developer.mozilla.org/zh-CN/docs/Glossary/Truthy)），来有条件地渲染元素。\n在切换时元素及它的数据绑定 / 组件被**销毁并重建**。\n\n- **注意**：如果元素是 `<block/>`，注意它并不是一个组件，它仅仅是一个包装元素，不会在页面中做任何渲染，只接受控制属性。\n\n- **DANGER**：当同时使用时，`wx:for` 比 `wx:if` 优先级更高。详见[列表渲染教程](https://mpxjs.cn/guide/basic/list-render.html)。',
      },
      references: [{ name: MpxDocs, url: `${MpxDirectivesUrl}wx-if` }],
    },
    {
      name: 'wx:elif',
      description: {
        kind: 'markdown',
        value:
          '表示 `wx:if` 的“else if 块”，可以进行链式调用。\n\n- **注意**：前一兄弟元素必须有 `wx:if` 或 `wx:elif`。',
      },
      references: [{ name: MpxDocs, url: `${MpxDirectivesUrl}wx-elif` }],
    },
    {
      name: 'wx:else',
      valueSet: 'v',
      description: {
        kind: 'markdown',
        value:
          '表示 `wx:if` 或 `wx:if` / `wx:elif` 链式调用的“else 块”。\n\n- **注意**：不需要表达式，前一兄弟元素必须有 `wx:if` 或 `wx:elif`。',
      },
      references: [{ name: MpxDocs, url: `${MpxDirectivesUrl}wx-else` }],
    },
    {
      name: 'wx:show',
      description: {
        kind: 'markdown',
        value:
          '基于表达式值的真假性，来改变元素的可见性。\n\n- **注意**：与 `wx:if` 所不同的是不会移除节点，而是设置节点的 style 为 `display: none`。',
      },
      references: [{ name: MpxDocs, url: `${MpxDirectivesUrl}wx-show` }],
    },
    {
      name: 'wx:for',
      description: {
        kind: 'markdown',
        value:
          '基于原始数据多次渲染元素或模板块。\n\n- **期望的绑定值类型**：`Array | Object | number | string`\n\n- **默认**：数组的当前项的下标变量名默认为 index，数组当前项的变量名默认为 item。',
      },
      references: [{ name: MpxDocs, url: `${MpxDirectivesUrl}wx-for` }],
    },
    {
      name: 'wx:for-item',
      description: {
        kind: 'markdown',
        value: '使用 wx:for-item 可以指定数组当前元素的变量名。',
      },
      references: [{ name: MpxDocs, url: `${MpxDirectivesUrl}wx-for-item` }],
    },
    {
      name: 'wx:for-index',
      description: {
        kind: 'markdown',
        value: '使用 wx:for-index 可以指定数组当前下标的变量名。',
      },
      references: [
        {
          name: MpxDocs,
          url: `${MpxDirectivesUrl}wx-for-index`,
        },
      ],
    },
    {
      name: 'wx:key',
      description: {
        kind: 'markdown',
        value:
          '如果列表中项目的位置会动态改变或者有新的项目添加到列表中，并且希望列表中的项目保持自己的特征和状态，需要使用 wx:key 来指定列表中项目的唯一的标识符。\n\n- **注意**：\n\n    - 如不提供 wx:key，会报一个 warning， 如果明确知道该列表是静态，或者不必关注其顺序，可以选择忽略。\n\n    - 有相同父元素的子元素必须有独特的 key。重复的 key 会造成渲染错误。',
      },
      references: [
        {
          name: MpxDocs,
          url: `${MpxDirectivesUrl}wx-key`,
        },
      ],
    },
    {
      name: 'wx:class',
      description: {
        kind: 'markdown',
        value: '绑定 HTML class，类似 vue 的 class 绑定。',
      },
      references: [
        {
          name: MpxDocs,
          url: `${MpxDirectivesUrl}wx-class`,
        },
      ],
    },
    {
      name: 'wx:style',
      description: {
        kind: 'markdown',
        value:
          'wx:style 的对象语法看着非常像 CSS，但其实是一个 JavaScript 对象。',
      },
      references: [
        {
          name: MpxDocs,
          url: `${MpxDirectivesUrl}wx-style`,
        },
      ],
    },
    {
      name: 'wx:ref',
      description: {
        kind: 'markdown',
        value:
          '`wx:ref=xxx` 来更方便获取 WXML 节点信息的对象。在JS里只需要通过`this.$refs.xxx`即可获取节点。',
      },
      references: [
        {
          name: MpxDocs,
          url: `${MpxDirectivesUrl}wx-ref`,
        },
      ],
    },
    {
      name: 'wx:model',
      description: {
        kind: 'markdown',
        value:
          '在表单输入元素或组件上创建双向绑定。\n\n- 该指令是一个语法糖指令，监听了组件抛出的输入事件并对绑定的数据进行更新。\n\n- 默认情况下会监听表单组件的 input 事件，并将 event.detail.value 中的数据更新到组件的 value 属性上。',
      },
      references: [
        {
          name: MpxDocs,
          url: `${MpxGuideUrl}/basic/two-way-binding.html`,
        },
      ],
    },
    {
      name: 'wx:model-event',
      description: {
        kind: 'markdown',
        value:
          'wx:model-event 和 wx:model-prop 指令用于修改双向绑定的监听事件和数据属性。\n\n- wx:model 指令默认监听组件抛出的 input 事件，并将声明的数据绑定到组件的 value 属性上，但某些组件可能不存在 input 事件或 value 属性。',
      },
      references: [
        {
          name: MpxDocs,
          url: `${MpxGuideUrl}/basic/two-way-binding.html#%E6%9B%B4%E6%94%B9%E5%8F%8C%E5%90%91%E7%BB%91%E5%AE%9A%E7%9A%84%E7%9B%91%E5%90%AC%E4%BA%8B%E4%BB%B6%E5%8F%8A%E6%95%B0%E6%8D%AE%E5%B1%9E%E6%80%A7`,
        },
      ],
    },
    {
      name: 'wx:model-prop',
      description: {
        kind: 'markdown',
        value:
          'wx:model-event 和 wx:model-prop 指令用于修改双向绑定的监听事件和数据属性。\n\n- wx:model 指令默认监听组件抛出的 input 事件，并将声明的数据绑定到组件的 value 属性上，但某些组件可能不存在 input 事件或 value 属性。',
      },
      references: [
        {
          name: MpxDocs,
          url: `${MpxGuideUrl}/basic/two-way-binding.html#%E6%9B%B4%E6%94%B9%E5%8F%8C%E5%90%91%E7%BB%91%E5%AE%9A%E7%9A%84%E7%9B%91%E5%90%AC%E4%BA%8B%E4%BB%B6%E5%8F%8A%E6%95%B0%E6%8D%AE%E5%B1%9E%E6%80%A7`,
        },
      ],
    },
    {
      name: 'wx:model-value-path',
      description: {
        kind: 'markdown',
        value:
          'wx:model-value-path 指令用于让用户声明在事件当中应该访问的数据路径。\n\n- wx:model 指令默认使用 event.detail.value 作为用户输入来更新组件数据，但在某些组件中可能不成立，例如 vant 中的 field 输入框组件，用户的输入直接存储在event.detail当中，当然用户也可以将其存放在detail中的其他数据路径下。',
      },
      references: [
        {
          name: MpxDocs,
          url: `${MpxGuideUrl}/basic/two-way-binding.html#%E6%9B%B4%E6%94%B9%E5%8F%8C%E5%90%91%E7%BB%91%E5%AE%9A%E4%BA%8B%E4%BB%B6%E6%95%B0%E6%8D%AE%E8%B7%AF%E5%BE%84`,
        },
      ],
    },
    {
      name: 'wx:model-filter',
      description: {
        kind: 'markdown',
        value:
          'wx:model-filter 指令用于定义双向绑定过滤器，在修改数据之前对用户输入进行过滤，来实现特定的效果。\n\n- 框架内置了 trim 过滤器对用户输入进行 trim 操作，传入其他字符串时会使用当前组件中的同名方法作为自定义过滤器。',
      },
      references: [
        {
          name: MpxDocs,
          url: `${MpxGuideUrl}/basic/two-way-binding.html#%E5%8F%8C%E5%90%91%E7%BB%91%E5%AE%9A%E8%BF%87%E6%BB%A4%E5%99%A8`,
        },
      ],
    },
    {
      name: 'bindtouchstart',
      description: {
        kind: 'markdown',
        value: '事件绑定 - 常用事件。\n\n- **触发条件**：手指触摸动作开始。',
      },
      references: [
        { name: MpxDocs, url: '${MpxGuideUrl}/basic/event.html' },
        {
          name: WxDocs,
          url: `${WxDocsUrl}/framework/view/wxml/event.html#%E4%BA%8B%E4%BB%B6%E8%AF%A6%E8%A7%A3`,
        },
      ],
    },
    {
      name: 'bindtouchmove',
      description: {
        kind: 'markdown',
        value: '事件绑定 - 常用事件。\n\n- **触发条件**：手指触摸后移动。',
      },
      references: [
        { name: MpxDocs, url: '${MpxGuideUrl}/basic/event.html' },
        {
          name: WxDocs,
          url: `${WxDocsUrl}/framework/view/wxml/event.html#%E4%BA%8B%E4%BB%B6%E8%AF%A6%E8%A7%A3`,
        },
      ],
    },
    {
      name: 'bindtouchcancel',
      description: {
        kind: 'markdown',
        value:
          '事件绑定 - 常用事件。\n\n- **触发条件**：手指触摸动作被打断，如来电提醒，弹窗。',
      },
      references: [
        { name: MpxDocs, url: '${MpxGuideUrl}/basic/event.html' },
        {
          name: WxDocs,
          url: `${WxDocsUrl}/framework/view/wxml/event.html#%E4%BA%8B%E4%BB%B6%E8%AF%A6%E8%A7%A3`,
        },
      ],
    },
    {
      name: 'bindtouchend',
      description: {
        kind: 'markdown',
        value: '事件绑定 - 常用事件。\n\n- **触发条件**：手指触摸动作结束。',
      },
      references: [
        { name: MpxDocs, url: '${MpxGuideUrl}/basic/event.html' },
        {
          name: WxDocs,
          url: `${WxDocsUrl}/framework/view/wxml/event.html#%E4%BA%8B%E4%BB%B6%E8%AF%A6%E8%A7%A3`,
        },
      ],
    },
    {
      name: 'bindtap',
      description: {
        kind: 'markdown',
        value: '事件绑定 - 常用事件。\n\n- **触发条件**：手指触摸后马上离开。',
      },
      references: [
        { name: MpxDocs, url: '${MpxGuideUrl}/basic/event.html' },
        {
          name: WxDocs,
          url: `${WxDocsUrl}/framework/view/wxml/event.html#%E4%BA%8B%E4%BB%B6%E8%AF%A6%E8%A7%A3`,
        },
      ],
    },
    {
      name: 'bindlongpress',
      description: {
        kind: 'markdown',
        value:
          '事件绑定 - 常用事件。\n\n- **触发条件**：手指触摸后，超过 350ms 再离开，推荐使用 `longpress` 代替 `longtap`。',
      },
      references: [
        { name: MpxDocs, url: '${MpxGuideUrl}/basic/event.html' },
        {
          name: WxDocs,
          url: `${WxDocsUrl}/framework/view/wxml/event.html#%E4%BA%8B%E4%BB%B6%E8%AF%A6%E8%A7%A3`,
        },
      ],
    },
    {
      name: 'bindlongtap',
      description: {
        kind: 'markdown',
        value:
          '事件绑定 - 常用事件。\n\n- **触发条件**：手指触摸后，超过 350ms 再离开，推荐使用 `longpress` 代替 `longtap`。',
      },
      references: [
        { name: MpxDocs, url: '${MpxGuideUrl}/basic/event.html' },
        {
          name: WxDocs,
          url: `${WxDocsUrl}/framework/view/wxml/event.html#%E4%BA%8B%E4%BB%B6%E8%AF%A6%E8%A7%A3`,
        },
      ],
    },
    {
      name: 'catch',
      description: {
        kind: 'markdown',
        value:
          '事件绑定的基础绑定方式 - **阻止冒泡**。\n\n- 事件绑定的写法同组件的属性，以 key、value 的形式。\n\n  ```html\n  <view catchtap="handleTap">阻止冒泡的点击事件</view>\n  <!-- 也可以写成 -->\n  <view catch:tap="handleTap">阻止冒泡的点击事件</view>\n  ```\n\n)',
      },
      references: [
        { name: MpxDocs, url: '${MpxGuideUrl}/basic/event.html' },
        {
          name: WxDocs,
          url: `${WxDocsUrl}/framework/view/wxml/event.html#%E4%BA%8B%E4%BB%B6%E8%AF%A6%E8%A7%A3`,
        },
      ],
    },
    {
      name: 'slot',
      description: {
        kind: 'markdown',
        value: '用于声明具名插槽或是期望接收 props 的作用域插槽。',
      },
      references: [
        {
          name: MpxDocs,
          url: `${MpxGuideUrl}/basic/component.html#slot`,
        },
      ],
    },
  ],
}

export default data
