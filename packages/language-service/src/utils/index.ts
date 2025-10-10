/**
 * 判断组件路径是否为小程序自定义插件组件路径
 * See https://developers.weixin.qq.com/miniprogram/dev/framework/plugin/using.html
 */
export const isMpPluginComponentPath = (componentPath: string) => {
  return componentPath.startsWith('plugin://')
}
