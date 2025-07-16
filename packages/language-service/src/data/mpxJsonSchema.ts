import { WxDocs, WxDocsUrl } from './utils'

const WxUrl =
  WxDocsUrl + '/reference/configuration/page.html#%E9%85%8D%E7%BD%AE%E9%A1%B9'

const WxDocsWithUrl = `[${WxDocs}](${WxUrl})`

export default {
  properties: {
    component: {
      type: 'boolean',
      enum: [true],
      default: true,
      markdownDescription: `自定义组件声明。\n\n详见：[${WxDocs}](${WxDocsUrl}/framework/custom-component/)`,
    },
    usingComponents: {
      type: 'object',
      markdownDescription: `页面自定义组件配置。\n\n详见：[Mpx 文档](https://mpxjs.cn/guide/basic/component.html#%E8%87%AA%E5%AE%9A%E4%B9%89%E7%BB%84%E4%BB%B6) | ${WxDocsWithUrl}`,
    },
    componentPlaceholder: {
      type: 'object',
      markdownDescription: `占位组件配置。\n\n详见：[${WxDocs}](${WxDocsUrl}/framework/custom-component/placeholder.html)`,
    },
    navigationBarBackgroundColor: {
      type: 'string',
      markdownDescription: `导航栏背景颜色，如 #000000。\n\n详见：${WxDocsWithUrl}`,
    },
    navigationBarTextStyle: {
      type: 'string',
      enum: ['black', 'white'],
      default: 'white',
      markdownDescription: `导航栏标题、状态栏颜色，仅支持 black / white。\n\n详见：${WxDocsWithUrl}`,
    },
    navigationBarTitleText: {
      type: 'string',
      markdownDescription: `导航栏标题文字内容。\n\n详见：${WxDocsWithUrl}`,
    },
    navigationStyle: {
      type: 'string',
      enum: ['default', 'custom'],
      default: 'default',
      markdownDescription: `导航栏样式，仅支持以下值：\n\n- default 默认样式\n- custom 自定义导航栏，只保留右上角胶囊按钮。\n\n详见：${WxDocsWithUrl}`,
    },
    homeButton: {
      type: 'boolean',
      default: false,
      markdownDescription: `在非首页、非页面栈最底层页面或非 tabbar 内页面中的导航栏展示 home 键。\n\n详见：${WxDocsWithUrl}`,
    },
    backgroundColor: {
      type: 'string',
      default: '#ffffff',
      markdownDescription: `页面背景颜色，如 #000000。\n\n详见：${WxDocsWithUrl}`,
    },
    backgroundColorContent: {
      type: 'string',
      default: '#RRGGBBAA',
      markdownDescription: `页面容器背景色。\n\n详见：${WxDocsWithUrl}`,
    },
    backgroundTextStyle: {
      type: 'string',
      enum: ['dark', 'light'],
      default: 'dark',
      markdownDescription: `下拉 loading 的样式，仅支持 dark / light。\n\n详见：${WxDocsWithUrl}`,
    },
    backgroundColorTop: {
      type: 'string',
      default: '#ffffff',
      markdownDescription: `顶部窗口的背景色，仅 iOS 支持。\n\n详见：${WxDocsWithUrl}`,
    },
    backgroundColorBottom: {
      type: 'string',
      default: '#ffffff',
      markdownDescription: `底部窗口的背景色，仅 iOS 支持。\n\n详见：${WxDocsWithUrl}`,
    },
    enablePullDownRefresh: {
      type: 'boolean',
      default: false,
      markdownDescription: `是否开启当前页面下拉刷新，默认 false。\n\n详见：${WxDocsWithUrl}`,
    },
    pageOrientation: {
      type: 'string',
      enum: ['auto', 'portrait', 'landscape'],
      default: 'portrait',
      markdownDescription: `屏幕旋转设置，仅支持：\n\n- auto 自动\n- portrait 竖屏，默认值\n- landscape 横屏\n\n详见：${WxDocsWithUrl}`,
    },
    disableScroll: {
      type: 'boolean',
      default: false,
      markdownDescription: `设置为 true 则页面整体不能上下滚动。只在页面配置中有效，无法在 app.json 中设置。\n\n详见：${WxDocsWithUrl}`,
    },
    restartStrategy: {
      type: 'string',
      default: 'homePage',
      markdownDescription: `重新启动策略配置，默认 homePage。\n\n详见：${WxDocsWithUrl}`,
    },
    renderer: {
      type: 'string',
      enum: ['webview', 'skyline', 'xr-frame'],
      default: 'webview',
      markdownDescription: `渲染后端。\n\n详见：${WxDocsWithUrl}`,
    },
    componentFramework: {
      type: 'string',
      markdownDescription: `组件框架。\n\n详见：[${WxDocs}](${WxDocsUrl}/framework/custom-component/glass-easel/migration.html#JSON-配置)`,
    },
  },
}
