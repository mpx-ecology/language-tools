import type * as html from 'vscode-html-languageservice'
import {
  MpxDirectivesUrl,
  MpxDocs,
  MpxGuideUrl,
  WxDocs,
  WxDocsUrl,
} from './utils'

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
              '指定要使用的模板名称，可以是字符串或表达式\n- 注意：字符串需与 name 一致；表达式需返回一个字符串',
          },
        },
        {
          name: 'name',
          description: {
            kind: 'markdown',
            value: '模板唯一标识名\n- 注意：标识唯一，供is引用',
          },
        },
        {
          name: 'data',
          description: {
            kind: 'markdown',
            value:
              '模板初始数据\n- 默认值：{}\n- 注意：用{{data.xxx}}访问，基础类型需包装为对象',
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
        value: `视图容器。\n- 注意：如果需要使用滚动视图，请使用 [scroll-view](${WxCompUrl}/scroll-view.html)。\n\n- 支持 Mpx 跨端输出 RN 的基础组件。`,
      },
      attributes: [
        {
          name: 'hover-class',
          description: {
            kind: 'markdown',
            value:
              '指定按下去的样式类\n默认值：none\n- 注意：hover-class="none"时无点击态效果',
          },
        },
        {
          name: 'hover-stop-propagation',
          description: {
            kind: 'markdown',
            value: '是否阻止祖先节点的点击态\n默认值：false',
          },
        },
        {
          name: 'hover-start-time',
          description: {
            kind: 'markdown',
            value: '按住后出现点击态的延迟时间（ms）\n- 默认值：50',
          },
        },
        {
          name: 'hover-stay-time',
          description: {
            kind: 'markdown',
            value: '手指松开后点击态的保留时间（ms）\n- 默认值：400',
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
            value: '是否支持横向滚动\n- 默认值：false',
          },
        },
        {
          name: 'scroll-y',
          description: {
            kind: 'markdown',
            value: '是否支持纵向滚动\n- 默认值：false',
          },
        },
        {
          name: 'upper-threshold',
          description: {
            kind: 'markdown',
            value: '距离顶部/左边触发scrolltoupper的距离\n- 默认值：50',
          },
        },
        {
          name: 'lower-threshold',
          description: {
            kind: 'markdown',
            value: '距离底部/右边触发scrolltolower的距离\n- 默认值：50',
          },
        },
        {
          name: 'scroll-top',
          description: {
            kind: 'markdown',
            value: '设置竖向滚动条位置',
          },
        },
        {
          name: 'scroll-left',
          description: {
            kind: 'markdown',
            value: '设置横向滚动条位置',
          },
        },
        {
          name: 'scroll-into-view',
          description: {
            kind: 'markdown',
            value:
              '滚动到指定子元素（值为子元素id，id不能以数字开头）\n- 注意：按滚动方向定位',
          },
        },
        {
          name: 'scroll-into-view-offset',
          description: {
            kind: 'markdown',
            value: '跳转到scroll-into-view目标节点的额外偏移\n- 默认值：0',
          },
        },
        {
          name: 'scroll-with-animation',
          description: {
            kind: 'markdown',
            value: '设置滚动条位置时是否使用动画\n- 默认值：false',
          },
        },
        {
          name: 'enable-back-to-top',
          description: {
            kind: 'markdown',
            value:
              '点击顶部状态栏/双击标题栏时返回顶部（仅竖向有效）\n- 默认值：false',
          },
        },
        {
          name: 'enable-passive',
          description: {
            kind: 'markdown',
            value: '开启passive特性优化滚动性能\n- 默认值：false',
          },
        },
        {
          name: 'refresher-enabled',
          description: {
            kind: 'markdown',
            value: '是否开启下拉刷新\n- 默认值：false',
          },
        },
        {
          name: 'refresher-threshold',
          description: {
            kind: 'markdown',
            value: '下拉刷新阈值\n- 默认值：45',
          },
        },
        {
          name: 'refresher-default-style',
          description: {
            kind: 'markdown',
            value: '下拉刷新默认样式',
          },
          valueSet: 't',
          values: [
            { name: 'black', description: '黑色' },
            { name: 'white', description: '白色' },
            { name: 'none', description: '不使用默认样式' },
          ],
        },
        {
          name: 'refresher-background',
          description: {
            kind: 'markdown',
            value: '下拉刷新区域背景色\n- 默认值：透明',
          },
        },
        {
          name: 'refresher-triggered',
          description: {
            kind: 'markdown',
            value:
              '下拉刷新状态（true为已触发，false为未触发）\n- 默认值：false',
          },
        },
        {
          name: 'bounces',
          description: {
            kind: 'markdown',
            value: 'iOS下边界弹性控制（需开启enhanced）\n- 默认值：true',
          },
        },
        {
          name: 'show-scrollbar',
          description: {
            kind: 'markdown',
            value: '滚动条显隐控制（需开启enhanced）\n- 默认值：true',
          },
        },
        {
          name: 'fast-deceleration',
          description: {
            kind: 'markdown',
            value:
              '滑动减速速率控制（iOS下生效，需开启enhanced）\n- 默认值：false',
          },
        },
        {
          name: 'binddragstart',
          description: {
            kind: 'markdown',
            value:
              '滑动开始事件（需开启enhanced）\n- 事件对象：{scrollTop, scrollLeft}',
          },
        },
        {
          name: 'binddragging',
          description: {
            kind: 'markdown',
            value:
              '滑动中事件（需开启enhanced）\n- 事件对象：{scrollTop, scrollLeft}',
          },
        },
        {
          name: 'binddragend',
          description: {
            kind: 'markdown',
            value:
              '滑动结束事件（需开启enhanced）\n- 事件对象：{scrollTop, scrollLeft, velocity}',
          },
        },
        {
          name: 'bindscrolltoupper',
          description: {
            kind: 'markdown',
            value: '滚动到顶部/左边时触发',
          },
        },
        {
          name: 'bindscrolltolower',
          description: {
            kind: 'markdown',
            value: '滚动到底部/右边时触发',
          },
        },
        {
          name: 'bindscroll',
          description: {
            kind: 'markdown',
            value:
              '滚动时触发\n- 事件对象：{scrollLeft, scrollTop, scrollHeight, scrollWidth, deltaX, deltaY}',
          },
        },
        {
          name: 'bindrefresherpulling',
          description: {
            kind: 'markdown',
            value: '下拉刷新控件被下拉时触发',
          },
        },
        {
          name: 'bindrefresherrefresh',
          description: {
            kind: 'markdown',
            value: '下拉刷新控件被触发时触发',
          },
        },
        {
          name: 'bindrefresherrestore',
          description: {
            kind: 'markdown',
            value: '下拉刷新控件被恢复时触发',
          },
        },
        {
          name: 'bindrefresherabort',
          description: {
            kind: 'markdown',
            value: '下拉刷新控件被中止时触发',
          },
        },
        {
          name: 'scroll-anchoring',
          description: {
            kind: 'markdown',
            value: '开启scroll anchoring特性（控制滚动位置不随内容抖动）',
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
        value: `滑块视图容器。\n\n- 注意：其中只可放置 swiper-item 组件，否则会导致未定义的行为。`,
      },
      attributes: [
        {
          name: 'indicator-dots',
          description: {
            kind: 'markdown',
            value: '是否显示面板指示点\n- 默认值：false',
          },
        },
        {
          name: 'indicator-color',
          description: {
            kind: 'markdown',
            value: '指示点颜色\n- 默认值：rgba(0,0,0,.3)',
          },
        },
        {
          name: 'indicator-active-color',
          description: {
            kind: 'markdown',
            value: '当前选中指示点颜色\n- 默认值：#000000',
          },
        },
        {
          name: 'autoplay',
          description: {
            kind: 'markdown',
            value: '是否自动切换\n- 默认值：false',
          },
        },
        {
          name: 'current',
          description: {
            kind: 'markdown',
            value: '当前滑块索引\n- 默认值：0',
          },
        },
        {
          name: 'interval',
          description: {
            kind: 'markdown',
            value: '自动切换间隔（ms）\n- 默认值：5000',
          },
        },
        {
          name: 'duration',
          description: {
            kind: 'markdown',
            value: '滑动动画时长（ms）\n- 默认值：500',
          },
        },
        {
          name: 'circular',
          description: {
            kind: 'markdown',
            value: '是否衔接滑动\n- 默认值：false',
          },
        },
        {
          name: 'vertical',
          description: {
            kind: 'markdown',
            value: '是否纵向滑动\n- 默认值：false',
          },
        },
        {
          name: 'display-multiple-items',
          description: {
            kind: 'markdown',
            value: '同时显示的滑块数量\n- 默认值：1',
          },
        },
        {
          name: 'previous-margin',
          description: {
            kind: 'markdown',
            value: '前边距（可露出前一项部分，支持px/rpx）\n- 默认值："0px"',
          },
        },
        {
          name: 'next-margin',
          description: {
            kind: 'markdown',
            value: '后边距（可露出后一项部分，支持px/rpx）\n- 默认值："0px"',
          },
        },
        {
          name: 'easing-function',
          description: {
            kind: 'markdown',
            value: '切换缓动动画类型\n- 默认值："default"',
          },
          valueSet: 't',
          values: [
            { name: 'default', description: '默认缓动函数' },
            { name: 'linear', description: '线性动画' },
            { name: 'easeInCubic', description: '缓入动画' },
            { name: 'easeOutCubic', description: '缓出动画' },
            { name: 'easeInOutCubic', description: '缓入缓出动画' },
          ],
        },
        {
          name: 'direction',
          description: {
            kind: 'markdown',
            value: '切换方向\n- 默认值："all"',
          },
          valueSet: 't',
          values: [
            { name: 'all', description: '默认' },
            {
              name: 'positive',
              description:
                '只允许正向滑动，vertical 为 true 时，表示向下滑动，为 false 时，表示向右滑动',
            },
            {
              name: 'negative',
              description:
                '只允许反向滑动，vertical 为 true 时，表示向上滑动，为 false 时，表示向左滑动',
            },
          ],
        },
        {
          name: 'bindchange',
          description: {
            kind: 'markdown',
            value: 'current改变时触发\n- 事件对象：{current, source}',
          },
        },
        {
          name: 'bindtransition',
          description: {
            kind: 'markdown',
            value: '滑块位置变化时触发\n- 事件对象：{dx, dy}',
          },
        },
        {
          name: 'bindanimationfinish',
          description: {
            kind: 'markdown',
            value: '滑块动画结束时触发\n- 事件对象：{current, source}',
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
        value: `滑块视图容器子元素。\n\n- 注意：仅可放置在 swiper 组件中，宽高自动设置为 100%。`,
      },
      attributes: [
        {
          name: 'item-id',
          description: {
            kind: 'markdown',
            value: '当前swiper-item的唯一标识符',
          },
        },
        {
          name: 'skip-hidden-item-layout',
          description: {
            kind: 'markdown',
            value: '是否跳过隐藏项的布局计算\n- 默认值：false',
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
        value: `[movable-view](${WxCompUrl}/movable-view.html) 的可移动区域。\n\n- 注意：movable-area 不支持设置 scale-area`,
      },
      attributes: [
        {
          name: 'scale-area',
          description: {
            kind: 'markdown',
            value: '是否开启缩放区域\n- 默认值：false',
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
        value: `可移动的视图容器，在页面中可以拖拽滑动。\n\n- 注意：movable-view 必须在 [movable-area](${WxCompUrl}/movable-area.html) 组件中，并且必须是直接子节点，否则不能移动。`,
      },
      attributes: [
        {
          name: 'direction',
          description: {
            kind: 'markdown',
            value: '移动方向\n- 默认值："none"',
          },
          valueSet: 't',
          values: [
            { name: 'all', description: '水平垂直方向' },
            { name: 'vertical', description: '垂直方向' },
            { name: 'horizontal', description: '水平方向' },
            { name: 'none', description: '不允许移动' },
          ],
        },
        {
          name: 'inertia',
          description: {
            kind: 'markdown',
            value: '是否带惯性\n- 默认值：false',
          },
        },
        {
          name: 'out-of-bounds',
          description: {
            kind: 'markdown',
            value: '是否允许移出可移动区域\n- 默认值：false',
          },
        },
        {
          name: 'x',
          description: {
            kind: 'markdown',
            value: 'x轴偏移量（支持px/rpx，超出范围会自动调整）',
          },
        },
        {
          name: 'y',
          description: {
            kind: 'markdown',
            value: 'y轴偏移量（支持px/rpx，超出范围会自动调整）',
          },
        },
        {
          name: 'damping',
          description: {
            kind: 'markdown',
            value: '阻尼系数（值越大移动越快）\n- 默认值：20',
          },
        },
        {
          name: 'friction',
          description: {
            kind: 'markdown',
            value: '摩擦系数（值越大滑动越快停止，需>0）\n- 默认值：2',
          },
        },
        {
          name: 'disabled',
          description: {
            kind: 'markdown',
            value: '是否禁用\n- 默认值：false',
          },
        },
        {
          name: 'scale',
          description: {
            kind: 'markdown',
            value: '是否支持双指缩放\n- 默认值：false',
          },
        },
        {
          name: 'scale-min',
          description: {
            kind: 'markdown',
            value: '缩放最小值\n- 默认值：0.1',
          },
        },
        {
          name: 'scale-max',
          description: {
            kind: 'markdown',
            value: '缩放最大值\n- 默认值：10',
          },
        },
        {
          name: 'scale-value',
          description: {
            kind: 'markdown',
            value: '缩放倍数（0.1-10）\n- 默认值：1',
          },
        },
        {
          name: 'animation',
          description: {
            kind: 'markdown',
            value: '是否使用动画\n- 默认值：true',
          },
        },
        {
          name: 'bindchange',
          description: {
            kind: 'markdown',
            value: '位置变化时触发\n- 事件对象：{x, y, source}',
          },
        },
        {
          name: 'bindscale',
          description: {
            kind: 'markdown',
            value: '缩放时触发\n- 事件对象：{x, y, scale}',
          },
        },
        {
          name: 'htouchmove',
          description: {
            kind: 'markdown',
            value: '水平方向触摸移动时触发',
          },
        },
        {
          name: 'vtouchmove',
          description: {
            kind: 'markdown',
            value: '垂直方向触摸移动时触发',
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
            value: '是否从页面中脱离出来。\n- 默认值：true',
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
          '覆盖在原生组件之上的文本视图。功能同 view 组件。\n\n- 注意：目前微信原生组件均已支持同层渲染，建议使用 view 替代。（详见微信文档）',
      },
      attributes: [
        {
          name: 'scroll-top',
          description: {
            kind: 'markdown',
            value:
              '顶部滚动偏移量（仅在overflow-y:scroll时生效）\n- 注意：字符串会尝试转为数字，失败则无效',
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
            value: '图标类型',
          },
          valueSet: 't',
          values: [
            { name: 'success', description: '成功' },
            { name: 'success_no_circle', description: '成功（无图标）' },
            { name: 'info', description: '信息' },
            { name: 'warn', description: '警告' },
            { name: 'waiting', description: '等待' },
            { name: 'cancel', description: '取消' },
            { name: 'download', description: '下载' },
            { name: 'search', description: '搜索' },
            { name: 'clear', description: '清除' },
          ],
        },
        {
          name: 'size',
          description: {
            kind: 'markdown',
            value: '图标大小\n- 默认值：23',
          },
        },
        {
          name: 'color',
          description: {
            kind: 'markdown',
            value: '图标颜色（同CSS color）',
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
            value: '文本是否可选\n- 默认值：false\n- 注意：已废弃',
          },
        },
        {
          name: 'user-select',
          description: {
            kind: 'markdown',
            value:
              '是否允许用户选中文字\n- 默认值：false\n- 注意：该属性会使文本节点显示为 inline-block',
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
            value: '按钮大小\n- 默认值：default',
          },
          valueSet: 't',
          values: [
            { name: 'default', description: '默认大小' },
            { name: 'mini', description: '小尺寸' },
          ],
        },
        {
          name: 'type',
          description: {
            kind: 'markdown',
            value: '按钮样式类型\n- 默认值：default',
          },
          valueSet: 't',
          values: [
            { name: 'primary', description: '绿色' },
            { name: 'default', description: '白色' },
            { name: 'warn', description: '红色' },
          ],
        },
        {
          name: 'plain',
          description: {
            kind: 'markdown',
            value: '是否镂空（背景透明）\n- 默认值：false',
          },
        },
        {
          name: 'disabled',
          description: {
            kind: 'markdown',
            value: '是否禁用\n- 默认值：false',
          },
        },
        {
          name: 'loading',
          description: {
            kind: 'markdown',
            value: '名称前是否带loading图标\n- 默认值：false',
          },
        },
        {
          name: 'form-type',
          description: {
            kind: 'markdown',
            value: '用于form组件，触发submit/reset事件',
          },
          valueSet: 't',
          values: [
            { name: 'submit', description: '提交' },
            { name: 'reset', description: '重置' },
            { name: 'submitToGroup', description: '转发文本到聊天' },
          ],
        },
        {
          name: 'open-type',
          description: {
            kind: 'markdown',
            value: '微信开放能力',
          },
          valueSet: 't',
          values: [
            { name: 'contact', description: '客服会话' },
            {
              name: 'liveActivity',
              description: '通过前端获取新的一次性订阅消息下发机制使用的 code',
            },
            { name: 'share', description: '分享' },
            { name: 'getUserInfo', description: '获取用户信息' },
            { name: 'launchApp', description: '打开APP' },
            { name: 'openSetting', description: '授权设置' },
            { name: 'feedback', description: '意见反馈' },
            { name: 'getPhoneNumber', description: '获取手机号' },
            { name: 'getRealtimePhoneNumber', description: '手机号实时验证' },
            { name: 'chooseAvatar', description: '获取用户头像' },
            { name: 'agreePrivacyAuthorization', description: '同意隐私授权' },
          ],
        },
        {
          name: 'hover-class',
          description: {
            kind: 'markdown',
            value: '点击时的样式类\n- 注意：hover-class="none"时无点击态',
          },
        },
        {
          name: 'hover-stop-propagation',
          description: {
            kind: 'markdown',
            value: '是否阻止祖先节点的点击态\n- 默认值：false',
          },
        },
        {
          name: 'hover-start-time',
          description: {
            kind: 'markdown',
            value: '按住后出现点击态的延迟（ms）\n- 默认值：20',
          },
        },
        {
          name: 'hover-stay-time',
          description: {
            kind: 'markdown',
            value: '手指松开后点击态的保留时间（ms）\n- 默认值：70',
          },
        },
        {
          name: 'lang',
          description: {
            kind: 'markdown',
            value: '返回用户信息的语言\n- 默认值：zh_CN',
          },
          valueSet: 't',
          values: [
            { name: 'zh_CN', description: '中文' },
            { name: 'zh_TW', description: '繁体中文' },
            { name: 'en', description: '英文' },
          ],
        },
        {
          name: 'session-from',
          description: {
            kind: 'markdown',
            value: '会话来源（open-type="contact"时有效）',
          },
        },
        {
          name: 'send-message-title',
          description: {
            kind: 'markdown',
            value: '会话内消息卡片标题（open-type="contact"时有效）',
          },
        },
        {
          name: 'send-message-path',
          description: {
            kind: 'markdown',
            value: '消息卡片跳转路径（open-type="contact"时有效）',
          },
        },
        {
          name: 'send-message-img',
          description: {
            kind: 'markdown',
            value: '消息卡片图片（open-type="contact"时有效）',
          },
        },
        {
          name: 'app-parameter',
          description: {
            kind: 'markdown',
            value: '打开APP时传递的参数（open-type="launchApp"时有效）',
          },
        },
        {
          name: 'show-message-card',
          description: {
            kind: 'markdown',
            value: '是否显示会话内消息卡片（open-type="contact"时有效）',
          },
        },
        {
          name: 'phone-number-no-quota-toast',
          description: {
            kind: 'markdown',
            value:
              '手机号验证额度用尽时是否显示提示\n- 默认值：true\n- 注意：open-type为getPhoneNumber/getRealtimePhoneNumber时有效',
          },
        },
        {
          name: 'need-show-entrance',
          description: {
            kind: 'markdown',
            value: '转发文本消息是否带小程序入口\n- 默认值：true',
          },
        },
        {
          name: 'entrance-path',
          description: {
            kind: 'markdown',
            value:
              '从消息入口打开小程序的路径（默认聊天工具启动路径）\n- 默认值：""',
          },
        },
        {
          name: 'bindgetuserinfo',
          description: {
            kind: 'markdown',
            value:
              '获取用户信息回调（open-type="getUserInfo"时有效）\n- 回调数据同wx.getUserInfo',
          },
        },
        {
          name: 'bindcontact',
          description: {
            kind: 'markdown',
            value: '客服消息回调（open-type="contact"时有效）',
          },
        },
        {
          name: 'createliveactivity',
          description: {
            kind: 'markdown',
            value: '一次性订阅消息回调（open-type="liveActivity"时有效）',
          },
        },
        {
          name: 'bindgetphonenumber',
          description: {
            kind: 'markdown',
            value: '获取手机号回调（open-type="getPhoneNumber"时有效）',
          },
        },
        {
          name: 'bindgetrealtimephonenumber',
          description: {
            kind: 'markdown',
            value:
              '获取手机号实时验证回调（open-type="getRealTimePhoneNumber"时有效）',
          },
        },
        {
          name: 'binderror',
          description: {
            kind: 'markdown',
            value: '开放能力调用错误回调（open-type="launchApp"时有效）',
          },
        },
        {
          name: 'bindopensetting',
          description: {
            kind: 'markdown',
            value: '打开授权设置页回调（open-type="openSetting"时有效）',
          },
        },
        {
          name: 'bindlaunchapp',
          description: {
            kind: 'markdown',
            value: '打开APP成功回调（open-type="launchApp"时有效）',
          },
        },
        {
          name: 'bindchooseavatar',
          description: {
            kind: 'markdown',
            value: '获取用户头像回调（open-type="chooseAvatar"时有效）',
          },
        },
        {
          name: 'bindagreeprivacyauthorization',
          description: {
            kind: 'markdown',
            value:
              '同意隐私授权回调（open-type="agreePrivacyAuthorization"时有效）',
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
            value: '指定关联的表单元素的 ID。',
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
              '多选框标识（选中时触发checkbox-group的change事件并携带此值）',
          },
        },
        {
          name: 'disabled',
          description: {
            kind: 'markdown',
            value: '是否禁用\n- 默认值：false',
          },
        },
        {
          name: 'checked',
          description: {
            kind: 'markdown',
            value: '初始是否选中\n- 默认值：false',
          },
        },
        {
          name: 'color',
          description: {
            kind: 'markdown',
            value: '多选框颜色（同CSS color）\n- 默认值：#09BB07',
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
              '选中项变化时触发\n- 事件对象：{value: [选中的checkbox的value数组]}',
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
            value: '单选框标识（选中时radio-group的change事件携带此值）',
          },
        },
        {
          name: 'checked',
          description: {
            kind: 'markdown',
            value: '初始是否选中\n- 默认值：false',
          },
        },
        {
          name: 'disabled',
          description: {
            kind: 'markdown',
            value: '是否禁用\n- 默认值：false',
          },
        },
        {
          name: 'color',
          description: {
            kind: 'markdown',
            value: '单选框颜色（同CSS color）\n- 默认值：#09BB07',
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
            value: '是否在提交时报告数据（如formId、字段值）\n- 默认值：false',
          },
        },
        {
          name: 'report-submit-timeout',
          description: {
            kind: 'markdown',
            value: '检测formId有效性的超时时间（ms）\n- 默认值：0',
          },
        },
        {
          name: 'bindsubmit',
          description: {
            kind: 'markdown',
            value:
              '表单提交时触发\n- 事件对象：{value: {name: value}, formId: ""}',
          },
        },
        {
          name: 'bindreset',
          description: {
            kind: 'markdown',
            value: '表单重置时触发（如点击form-type="reset"的按钮）',
          },
        },
        {
          name: 'bindsubmitToGroup',
          description: {
            kind: 'markdown',
            value: '用户发送文本到聊天后触发（不代表最终发送成功）',
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
            value: '初始内容',
          },
        },
        {
          name: 'type',
          description: {
            kind: 'markdown',
            value: '输入框类型\n- 默认值：text',
          },
          valueSet: 't',
          values: [
            { name: 'text', description: '文本输入键盘' },
            { name: 'number', description: '数字输入键盘' },
            { name: 'idcard', description: '身份证输入键盘' },
            { name: 'digit', description: '带小数点的输入键盘' },
            { name: 'safe-password', description: '安全密码输入键盘' },
            { name: 'nickname', description: '昵称输入键盘' },
          ],
        },
        {
          name: 'password',
          description: {
            kind: 'markdown',
            value: '是否为密码类型\n- 默认值：false',
          },
        },
        {
          name: 'placeholder',
          description: {
            kind: 'markdown',
            value: '空值时的占位文本',
          },
        },
        {
          name: 'placeholder-style',
          description: {
            kind: 'markdown',
            value: '占位符样式（CSS字符串）',
          },
        },
        {
          name: 'disabled',
          description: {
            kind: 'markdown',
            value: '是否禁用\n- 默认值：false',
          },
        },
        {
          name: 'maxlength',
          description: {
            kind: 'markdown',
            value: '最大输入长度（-1为不限制）\n- 默认值：140',
          },
        },
        {
          name: 'cursor-spacing',
          description: {
            kind: 'markdown',
            value:
              '光标与键盘的距离（取input底部距离和此值的最小值）\n- 默认值：0',
          },
        },
        {
          name: 'auto-focus',
          description: {
            kind: 'markdown',
            value:
              '自动聚焦（拉起键盘）\n- 默认值：false\n- 注意：即将废弃，请直接使用 focus',
          },
        },
        {
          name: 'focus',
          description: {
            kind: 'markdown',
            value: '获取焦点\n- 默认值：false',
          },
        },
        {
          name: 'confirm-type',
          description: {
            kind: 'markdown',
            value: '键盘右下角按钮文字（仅type="text"时有效）\n- 默认值：done',
          },
          valueSet: 't',
          values: [
            { name: 'done', description: '完成' },
            { name: 'go', description: '前往' },
            { name: 'next', description: '下一个' },
            { name: 'search', description: '搜索' },
            { name: 'send', description: '发送' },
          ],
        },
        {
          name: 'always-embed',
          description: {
            kind: 'markdown',
            value: '强制input处于同层状态（iOS下生效）\n- 默认值：false',
          },
        },
        {
          name: 'confirm-hold',
          description: {
            kind: 'markdown',
            value: '点击完成按钮时是否保持键盘不收起\n- 默认值：false',
          },
        },
        {
          name: 'cursor',
          description: {
            kind: 'markdown',
            value: 'focus时的光标位置',
          },
        },
        {
          name: 'cursor-color',
          description: {
            kind: 'markdown',
            value:
              '光标颜色（iOS为十六进制，安卓支持default/green，Skyline无限制）',
          },
        },
        {
          name: 'selection-start',
          description: {
            kind: 'markdown',
            value:
              '光标起始位置（自动聚焦时有效，需配合selection-end）\n- 默认值：-1',
          },
        },
        {
          name: 'selection-end',
          description: {
            kind: 'markdown',
            value:
              '光标结束位置（自动聚焦时有效，需配合selection-start）\n- 默认值：-1',
          },
        },
        {
          name: 'adjust-position',
          description: {
            kind: 'markdown',
            value: '键盘弹起时是否上推页面\n- 默认值：true',
          },
        },
        {
          name: 'hold-keyboard',
          description: {
            kind: 'markdown',
            value: 'focus时点击页面是否不收起键盘\n- 默认值：false',
          },
        },
        {
          name: 'safe-password-cert-path',
          description: {
            kind: 'markdown',
            value: '安全键盘加密公钥路径（仅包内路径，鸿蒙不支持）',
          },
        },
        {
          name: 'safe-password-length',
          description: {
            kind: 'markdown',
            value: '安全键盘输入密码长度（鸿蒙不支持）',
          },
        },
        {
          name: 'safe-password-time-stamp',
          description: {
            kind: 'markdown',
            value: '安全键盘加密时间戳（鸿蒙不支持）',
          },
        },
        {
          name: 'safe-password-nonce',
          description: {
            kind: 'markdown',
            value: '安全键盘加密盐值（鸿蒙不支持）',
          },
        },
        {
          name: 'safe-password-salt',
          description: {
            kind: 'markdown',
            value: '计算hash的盐值（指定custom-hash则无效，鸿蒙不支持）',
          },
        },
        {
          name: 'safe-password-custom-hash',
          description: {
            kind: 'markdown',
            value: '计算hash的算法表达式，鸿蒙不支持）',
          },
        },
        {
          name: 'bindinput',
          description: {
            kind: 'markdown',
            value:
              '键盘输入时触发\n- 事件对象：{ value: string, cursor?: number, keyCode?: number }',
          },
        },
        {
          name: 'bindchange',
          description: {
            kind: 'markdown',
            value: '非聚焦状态内容改变时触发\n- 事件对象：{value: string}',
          },
        },
        {
          name: 'bindfocus',
          description: {
            kind: 'markdown',
            value:
              '聚焦时触发\n- 事件对象：{value: string, height: number}（ height 为键盘高度，1.9.90+支持）',
          },
        },
        {
          name: 'bindblur',
          description: {
            kind: 'markdown',
            value:
              '失焦时触发\n- 事件对象：{value: string, encryptedValue?: string, encryptError?: string}',
          },
        },
        {
          name: 'bindconfirm',
          description: {
            kind: 'markdown',
            value:
              '点击完成按钮时触发\n- 事件对象：{ value: string, encryptedValue?: string, encryptError?: string }',
          },
        },
        {
          name: 'bindkeyboardheightchange',
          description: {
            kind: 'markdown',
            value:
              '键盘高度变化时触发\n- 事件对象：{height: number, duration: number}',
          },
        },
        {
          name: 'bindnicknamereview',
          description: {
            kind: 'markdown',
            value:
              '昵称审核完毕后触发（仅type="nickname"时有效）\n- 事件对象：{ pass: boolean, timeout: boolean}',
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
            value: '输入框的内容',
          },
        },
        {
          name: 'placeholder',
          description: {
            kind: 'markdown',
            value: '空值时的占位文本',
          },
        },
        {
          name: 'placeholder-style',
          description: {
            kind: 'markdown',
            value: '占位符样式（CSS字符串）',
          },
        },
        {
          name: 'disabled',
          description: {
            kind: 'markdown',
            value: '是否禁用\n- 默认值：false',
          },
        },
        {
          name: 'maxlength',
          description: {
            kind: 'markdown',
            value: '最大输入长度（-1为不限制）\n- 默认值：140',
          },
        },
        {
          name: 'auto-focus',
          description: {
            kind: 'markdown',
            value: '自动聚焦（拉起键盘）\n- 默认值：false',
          },
        },
        {
          name: 'focus',
          description: {
            kind: 'markdown',
            value: '获取焦点\n- 默认值：false',
          },
        },
        {
          name: 'auto-height',
          description: {
            kind: 'markdown',
            value: '是否自动增高（高度随内容增加）\n- 默认值：false',
          },
        },
        {
          name: 'cursor-spacing',
          description: {
            kind: 'markdown',
            value:
              '光标与键盘的距离（取textarea底部距离和此值的最小值）\n- 默认值：0',
          },
        },
        {
          name: 'cursor',
          description: {
            kind: 'markdown',
            value: 'focus时的光标位置\n- 默认值：-1',
          },
        },
        {
          name: 'selection-start',
          description: {
            kind: 'markdown',
            value:
              '光标起始位置（自动聚焦时有效，需配合selection-end）\n- 默认值：-1',
          },
        },
        {
          name: 'selection-end',
          description: {
            kind: 'markdown',
            value:
              '光标结束位置（自动聚焦时有效，需配合selection-start）\n- 默认值：-1',
          },
        },
        {
          name: 'adjust-position',
          description: {
            kind: 'markdown',
            value: '键盘弹起时是否上推页面\n- 默认值：true',
          },
        },
        {
          name: 'hold-keyboard',
          description: {
            kind: 'markdown',
            value: 'focus时点击页面是否不收起键盘\n- 默认值：false',
          },
        },
        {
          name: 'disable-default-padding',
          description: {
            kind: 'markdown',
            value: '是否去掉iOS下的默认内边距\n- 默认值：false',
          },
        },
        {
          name: 'confirm-type',
          description: {
            kind: 'markdown',
            value: '键盘右下角按钮文字\n- 默认值：return',
          },
          valueSet: 't',
          values: [
            { name: 'send', description: '发送' },
            { name: 'search', description: '搜索' },
            { name: 'next', description: '下一个' },
            { name: 'go', description: '前往' },
            { name: 'done', description: '完成' },
            { name: 'return', description: '换行' },
          ],
        },
        {
          name: 'confirm-hold',
          description: {
            kind: 'markdown',
            value: '点击完成按钮时是否保持键盘不收起\n- 默认值：false',
          },
        },
        {
          name: 'adjust-keyboard-to',
          description: {
            kind: 'markdown',
            value: '键盘对齐位置\n- 默认值：cursor',
          },
          valueSet: 't',
          values: [
            { name: 'cursor', description: '对齐光标' },
            { name: 'bottom', description: '对齐输入框底部' },
          ],
        },
        {
          name: 'bindinput',
          description: {
            kind: 'markdown',
            value:
              '键盘输入时触发\n- 事件对象：{value, cursor, keyCode}（工具暂不支持keyCode）',
          },
        },
        {
          name: 'bindfocus',
          description: {
            kind: 'markdown',
            value:
              '聚焦时触发\n- 事件对象：{value, height}（height为键盘高度）',
          },
        },
        {
          name: 'bindblur',
          description: {
            kind: 'markdown',
            value: '失焦时触发\n- 事件对象：{value, cursor}',
          },
        },
        {
          name: 'bindlinechange',
          description: {
            kind: 'markdown',
            value: '行数变化时触发\n- 事件对象：{height, heightRpx, lineCount}',
          },
        },
        {
          name: 'bindconfirm',
          description: {
            kind: 'markdown',
            value: '点击完成时触发\n- 事件对象：{value}',
          },
        },
        {
          name: 'bindkeyboardheightchange',
          description: {
            kind: 'markdown',
            value: '键盘高度变化时触发\n- 事件对象：{height, duration}',
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
      attributes: [
        {
          name: 'value',
          description: {
            kind: 'markdown',
            value: '当前选中的下标数组（对应picker-view-column的选中下标）',
          },
        },
        {
          name: 'mask-class',
          description: {
            kind: 'markdown',
            value: '蒙层的类名',
          },
        },
        {
          name: 'indicator-style',
          description: {
            kind: 'markdown',
            value: '中间选中框的样式（CSS字符串）',
          },
        },
        {
          name: 'bindchange',
          description: {
            kind: 'markdown',
            value: '滚动选择时触发\n- 事件对象：{value}（选中项的下标数组）',
          },
        },
        {
          name: 'bindpickstart',
          description: {
            kind: 'markdown',
            value: '滚动选择开始时触发',
          },
        },
        {
          name: 'bindpickend',
          description: {
            kind: 'markdown',
            value: '滚动选择结束时触发',
          },
        },
      ],
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
      attributes: [
        {
          name: 'header-text',
          description: {
            kind: 'markdown',
            value: '选择器标题（仅安卓可用）',
          },
        },
        {
          name: 'mode',
          description: {
            kind: 'markdown',
            value: '选择器类型\n- 默认值：selector',
          },
          valueSet: 't',
          values: [
            { name: 'selector', description: '选择器-普通' },
            { name: 'multiSelector', description: '选择器-多列' },
            { name: 'time', description: '选择器-时间' },
            { name: 'date', description: '选择器-日期' },
            { name: 'region', description: '选择器-省市区' },
          ],
        },
        {
          name: 'disabled',
          description: {
            kind: 'markdown',
            value: '是否禁用\n- 默认值：false',
          },
        },
        {
          name: 'bindcancel',
          description: {
            kind: 'markdown',
            value: '取消选择时触发',
          },
        },
      ],
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
      attributes: [
        {
          name: 'src',
          description: {
            kind: 'markdown',
            value: '图片资源地址',
          },
        },
        {
          name: 'mode',
          description: {
            kind: 'markdown',
            value: '图片裁剪/缩放模式\n- 默认值：scaleToFill',
          },
          valueSet: 't',
          values: [
            { name: 'scaleToFill', description: '缩放模式-拉伸填满' },
            { name: 'aspectFit', description: '缩放模式-长边显示' },
            { name: 'aspectFill', description: '缩放模式-短边显示' },
            { name: 'widthFix', description: '缩放模式-宽定高自变' },
            { name: 'heightFix', description: '缩放模式-高定宽自变' },
            { name: 'top', description: '裁剪模式-只显示顶部区域' },
            { name: 'bottom', description: '裁剪模式-只显示底部区域' },
            { name: 'center', description: '裁剪模式-只显示中间区域' },
            { name: 'left', description: '裁剪模式-只显示左边区域' },
            { name: 'right', description: '裁剪模式-只显示右边区域' },
            { name: 'top left', description: '裁剪模式-只显示左上' },
            { name: 'top right', description: '裁剪模式-只显示右上' },
            { name: 'bottom left', description: '裁剪模式-只显示左下' },
            { name: 'bottom right', description: '裁剪模式-只显示右下' },
          ],
        },
        {
          name: 'show-menu-by-longpress',
          description: {
            kind: 'markdown',
            value: '长按是否显示识别小程序码菜单\n- 默认值：false',
          },
        },
        {
          name: 'binderror',
          description: {
            kind: 'markdown',
            value: '加载出错时触发\n- 事件对象：{errMsg}',
          },
        },
        {
          name: 'bindload',
          description: {
            kind: 'markdown',
            value: '加载完成时触发\n- 事件对象：{width, height}',
          },
        },
      ],
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
      attributes: [
        {
          name: 'checked',
          description: {
            kind: 'markdown',
            value: '初始是否选中\n- 默认值：false',
          },
        },
        {
          name: 'disabled',
          description: {
            kind: 'markdown',
            value: '是否禁用\n- 默认值：false',
          },
        },
        {
          name: 'type',
          description: {
            kind: 'markdown',
            value: '样式类型\n- 默认值：switch',
          },
          valueSet: 't',
          values: [
            { name: 'switch', description: '默认，开关样式' },
            { name: 'checkbox', description: '复选框样式' },
          ],
        },
        {
          name: 'color',
          description: {
            kind: 'markdown',
            value:
              '开关颜色（同CSS color，仅type="switch"有效）\n- 默认值：#04BE02',
          },
        },
        {
          name: 'bindchange',
          description: {
            kind: 'markdown',
            value: '状态变化时触发\n- 事件对象：{value}（当前状态true/false）',
          },
        },
      ],
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
      attributes: [
        {
          name: 'target',
          description: {
            kind: 'markdown',
            value: '跳转目标\n- 默认值：self',
          },
          valueSet: 't',
          values: [
            { name: 'self', description: '当前小程序' },
            { name: 'miniProgram', description: '其他小程序' },
          ],
        },
        {
          name: 'url',
          description: {
            kind: 'markdown',
            value: '当前小程序内的跳转链接',
          },
        },
        {
          name: 'open-type',
          description: {
            kind: 'markdown',
            value: '跳转方式\n- 默认值：navigate',
          },
          valueSet: 't',
          values: [
            { name: 'navigate', description: '保留当前页，wx.navigateTo' },
            { name: 'redirect', description: '关闭当前页，wx.redirectTo' },
            { name: 'switchTab', description: '跳tabBar，关其他非tab' },
            { name: 'reLaunch', description: '关所有页，wx.reLaunch' },
            { name: 'navigateBack', description: '返回，wx.navigateBack' },
            { name: 'exit', description: '退出，target=miniProgram时有效' },
          ],
        },
        {
          name: 'delta',
          description: {
            kind: 'markdown',
            value: '回退层数（open-type="navigateBack"时有效）\n- 默认值：1',
          },
        },
        {
          name: 'app-id',
          description: {
            kind: 'markdown',
            value:
              '目标小程序appId（target=miniProgram且open-type=navigate时有效）',
          },
        },
        {
          name: 'path',
          description: {
            kind: 'markdown',
            value:
              '目标小程序页面路径（target=miniProgram且open-type=navigate时有效，空则打开首页）',
          },
        },
        {
          name: 'extra-data',
          description: {
            kind: 'markdown',
            value:
              '传递给目标小程序的数据（target=miniProgram且open-type=navigate/navigateBack时有效，目标小程序在onLaunch/onShow中获取）',
          },
        },
        {
          name: 'version',
          description: {
            kind: 'markdown',
            value:
              '目标小程序版本（target=miniProgram时有效）\n- 默认值：release',
          },
          valueSet: 't',
          values: [
            { name: 'release', description: '正式版' },
            { name: 'trial', description: '体验版' },
            { name: 'develop', description: '开发版' },
          ],
        },
        {
          name: 'short-link',
          description: {
            kind: 'markdown',
            value:
              '小程序短链接（target=miniProgram时有效，传此参数可不传app-id和path，从【复制链接】获取）',
          },
        },
        {
          name: 'hover-class',
          description: {
            kind: 'markdown',
            value: '点击样式类\n- 注意：hover-class="none"时无点击态',
          },
        },
        {
          name: 'hover-stop-propagation',
          description: {
            kind: 'markdown',
            value: '是否阻止祖先节点的点击态\n- 默认值：false',
          },
        },
        {
          name: 'hover-start-time',
          description: {
            kind: 'markdown',
            value: '按住后出现点击态的延迟（ms）\n- 默认值：50',
          },
        },
        {
          name: 'hover-stay-time',
          description: {
            kind: 'markdown',
            value: '手指松开后点击态保留时间（ms）\n- 默认值：600',
          },
        },
        {
          name: 'bindsuccess',
          description: {
            kind: 'markdown',
            value:
              '跳转成功回调\n- 注意： target = miniProgram 且 open-type = navigate/navigateBack 时有效',
          },
        },
        {
          name: 'bindfail',
          description: {
            kind: 'markdown',
            value:
              '跳转失败回调\n- 注意： target = miniProgram 且 open-type = navigate/navigateBack 时有效',
          },
        },
        {
          name: 'bindcomplete',
          description: {
            kind: 'markdown',
            value:
              '跳转完成回调\n- 注意： target = miniProgram 且 open-type = navigate/navigateBack 时有效',
          },
        },
      ],
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
      attributes: [
        {
          name: 'nodes',
          description: {
            kind: 'markdown',
            value:
              '渲染节点列表\n- 支持格式：HTML字符串（如<div>文本</div>）或对象数组（每个对象含name标签名、attrs属性、children子节点）\n- 注意：仅支持官方安全标签子集',
          },
        },
        {
          name: 'space',
          description: {
            kind: 'markdown',
            value: '连续空格显示方式\n- 默认值：nbsp',
          },
          valueSet: 't',
          values: [
            { name: 'nbsp', description: '&nbsp;' },
            { name: 'emsp', description: '&emsp;' },
            { name: 'ensp', description: '&ensp;' },
          ],
        },
        {
          name: 'user-select',
          description: {
            kind: 'markdown',
            value: '文本是否可选（使节点为block）\n- 默认值：false',
          },
        },
      ],
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
      attributes: [
        {
          name: 'type',
          description: {
            kind: 'markdown',
            value: '渲染上下文类型\n- 默认值：2d',
          },
          valueSet: 't',
          values: [
            { name: '2d', description: '2D' },
            { name: 'webgl', description: '3D绘图' },
          ],
        },
        {
          name: 'canvas-id',
          description: {
            kind: 'markdown',
            value: '画布唯一标识符（指定type则无需此属性）',
          },
        },
        {
          name: 'disable-scroll',
          description: {
            kind: 'markdown',
            value:
              '是否禁止滚动穿透（画布滑动时不触发页面滚动）\n- 默认值：false',
          },
        },
        {
          name: 'bindtouchstart',
          description: {
            kind: 'markdown',
            value: '触摸开始时触发\n- 事件对象：{触摸点坐标、标识符等}',
          },
        },
        {
          name: 'bindtouchmove',
          description: {
            kind: 'markdown',
            value: '触摸滑动时触发\n- 事件对象：{触摸点实时坐标等}',
          },
        },
        {
          name: 'bindtouchend',
          description: {
            kind: 'markdown',
            value: '触摸结束时触发',
          },
        },
        {
          name: 'bindtouchcancel',
          description: {
            kind: 'markdown',
            value: '触摸被中断时触发（如来电、跳转）',
          },
        },
        {
          name: 'bindlongtap',
          description: {
            kind: 'markdown',
            value: '长按500ms后触发（触发后移动不触发屏幕滚动）',
          },
        },
        {
          name: 'binderror',
          description: {
            kind: 'markdown',
            value: '初始化或渲染错误时触发\n- 事件对象：{errMsg}',
          },
        },
      ],
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
      attributes: [
        {
          name: 'src',
          description: {
            kind: 'markdown',
            value:
              '网页链接\n- 说明：可打开关联公众号文章；其他网页需配置业务域名',
          },
        },
        {
          name: 'bindmessage',
          description: {
            kind: 'markdown',
            value:
              '网页向小程序postMessage时触发\n- 触发时机：小程序后退、组件销毁、分享、复制链接（2.31.1+）\n- 事件对象：{data}（多次postMessage的参数数组）',
          },
        },
        {
          name: 'bindload',
          description: {
            kind: 'markdown',
            value: '网页加载成功时触发\n- 事件对象：{src}（当前加载地址）',
          },
        },
        {
          name: 'binderror',
          description: {
            kind: 'markdown',
            value:
              '网页加载失败时触发\n- 事件对象：{url, fullUrl}（fullUrl为失败时的完整URL）',
          },
        },
      ],
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
      attributes: [
        {
          name: 'show',
          description: {
            kind: 'markdown',
            value: '是否显示\n- 默认值：false',
          },
        },
        {
          name: 'duration',
          description: {
            kind: 'markdown',
            value: '动画时长（ms）\n- 默认值：300',
          },
        },
        {
          name: 'z-index',
          description: {
            kind: 'markdown',
            value: '层级（控制堆叠顺序）\n- 默认值：100',
          },
        },
        {
          name: 'overlay',
          description: {
            kind: 'markdown',
            value: '是否显示遮罩层\n- 默认值：true',
          },
        },
        {
          name: 'position',
          description: {
            kind: 'markdown',
            value: '弹出位置\n- 默认值：bottom',
          },
          valueSet: 't',
          values: [
            { name: 'bottom', description: '底部' },
            { name: 'top', description: '顶部' },
            { name: 'right', description: '右侧' },
            { name: 'left', description: '左侧' },
          ],
        },
        {
          name: 'round',
          description: {
            kind: 'markdown',
            value: '是否显示圆角\n- 默认值：false',
          },
        },
        {
          name: 'close-on-slide-down',
          description: {
            kind: 'markdown',
            value:
              '是否允许向下滑动关闭（仅position=bottom时有效）\n- 默认值：false',
          },
        },
        {
          name: 'overlay-style',
          description: {
            kind: 'markdown',
            value: '遮罩层样式（CSS字符串）',
          },
        },
        {
          name: 'custom-style',
          description: {
            kind: 'markdown',
            value: '容器自定义样式（CSS字符串，调整外观）',
          },
        },
      ],
      references: [{ name: WxDocs, url: `${WxCompUrl}/page-container.html` }],
    },
  ],
  globalAttributes: [
    {
      name: 'wx:if',
      description: {
        kind: 'markdown',
        value:
          '基于表达式值的真假性（[Truthy](https://developer.mozilla.org/zh-CN/docs/Glossary/Truthy)），来有条件地渲染元素。\n在切换时元素及它的数据绑定 / 组件被**销毁并重建**。\n\n- 注意：如果元素是 `<block/>`，注意它并不是一个组件，它仅仅是一个包装元素，不会在页面中做任何渲染，只接受控制属性。\n\n- **DANGER**：当同时使用时，`wx:for` 比 `wx:if` 优先级更高。详见[列表渲染教程](https://mpxjs.cn/guide/basic/list-render.html)。',
      },
      references: [{ name: MpxDocs, url: `${MpxDirectivesUrl}wx-if` }],
    },
    {
      name: 'wx:elif',
      description: {
        kind: 'markdown',
        value:
          '表示 `wx:if` 的“else if 块”，可以进行链式调用。\n\n- 注意：前一兄弟元素必须有 `wx:if` 或 `wx:elif`。',
      },
      references: [{ name: MpxDocs, url: `${MpxDirectivesUrl}wx-elif` }],
    },
    {
      name: 'wx:else',
      valueSet: 'v',
      description: {
        kind: 'markdown',
        value:
          '表示 `wx:if` 或 `wx:if` / `wx:elif` 链式调用的“else 块”。\n\n- 注意：不需要表达式，前一兄弟元素必须有 `wx:if` 或 `wx:elif`。',
      },
      references: [{ name: MpxDocs, url: `${MpxDirectivesUrl}wx-else` }],
    },
    {
      name: 'wx:show',
      description: {
        kind: 'markdown',
        value:
          '基于表达式值的真假性，来改变元素的可见性。\n\n- 注意：与 `wx:if` 所不同的是不会移除节点，而是设置节点的 style 为 `display: none`。',
      },
      references: [{ name: MpxDocs, url: `${MpxDirectivesUrl}wx-show` }],
    },
    {
      name: 'wx:for',
      description: {
        kind: 'markdown',
        value:
          '基于原始数据多次渲染元素或模板块。\n\n- 期望的绑定值类型：`Array | Object | number | string`\n\n- 默认：数组的当前项的下标变量名默认为 index，数组当前项的变量名默认为 item。',
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
          '如果列表中项目的位置会动态改变或者有新的项目添加到列表中，并且希望列表中的项目保持自己的特征和状态，需要使用 wx:key 来指定列表中项目的唯一的标识符。\n\n- 注意：\n\n    - 如不提供 wx:key，会报一个 warning， 如果明确知道该列表是静态，或者不必关注其顺序，可以选择忽略。\n\n    - 有相同父元素的子元素必须有独特的 key。重复的 key 会造成渲染错误。',
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
        value: '事件绑定 - 常用事件。\n\n- 触发条件：手指触摸动作开始。',
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
        value: '事件绑定 - 常用事件。\n\n- 触发条件：手指触摸后移动。',
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
          '事件绑定 - 常用事件。\n\n- 触发条件：手指触摸动作被打断，如来电提醒，弹窗。',
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
        value: '事件绑定 - 常用事件。\n\n- 触发条件：手指触摸动作结束。',
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
        value: '事件绑定 - 常用事件。\n\n- 触发条件：手指触摸后马上离开。',
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
          '事件绑定 - 常用事件。\n\n- 触发条件：手指触摸后，超过 350ms 再离开，推荐使用 `longpress` 代替 `longtap`。',
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
          '事件绑定 - 常用事件。\n\n- 触发条件：手指触摸后，超过 350ms 再离开，推荐使用 `longpress` 代替 `longtap`。',
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
