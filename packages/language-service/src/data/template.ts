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
      attributes: [],
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
      attributes: [],
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
      attributes: [],
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
      attributes: [],
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
      attributes: [],
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
      attributes: [],
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
      attributes: [],
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
      attributes: [],
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
      attributes: [],
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
      attributes: [],
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
      attributes: [],
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
      attributes: [],
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
      attributes: [],
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
      attributes: [],
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
      attributes: [],
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
      attributes: [],
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
      attributes: [],
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
      attributes: [],
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
      attributes: [],
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
      attributes: [],
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
