export const scriptSnippets: Record<
  string,
  { label: string; description?: string; code: string }[]
> = {
  optionsAPI: [
    {
      label: 'createApp',
      description: '创建 App',
      code: `import mpx, { createApp } from '@mpxjs/core'
import apiProxy from '@mpxjs/api-proxy'\n
mpx.use(apiProxy, { usePromise: true })
createApp({
\t$1
})`,
    },
    {
      label: 'createComponent',
      description: '选项式 - 创建组件',
      code: `import { createComponent } from '@mpxjs/core'\n
createComponent({
\tproperties: {
\t\t// component properties
\t\t$1
\t},
\tdata: {
\t\t// data properties
\t},
\tcomputed: {
\t\t// computed properties
\t},
\tmethods: {
\t\t// methods
\t},
\t// other component options
})`,
    },
    {
      label: 'createPage',
      description: '选项式 - 创建页面',
      code: `import { createPage } from '@mpxjs/core'\n
createPage({
\tonLoad () {
\t\t// 页面加载时执行，可以在 onLoad 参数中获取打开当前页面路径中的参数
\t\t$1
\t},
})`,
    },
  ],
  compositionAPI: [
    {
      label: '',
      description: '组合式语法',
      code: `defineProps({})
$1
defineExpose({})`,
    },
  ],
  jsonJs: [
    {
      label: '',
      description: 'JSON 模块 - 使用 js 语法',
      code: `\tmodule.exports = {
\t\tusingComponents: {
\t\t\t// 自定义组件
\t\t\t$1
\t\t}
\t}`,
    },
  ],
  jsonJson: [
    {
      label: '',
      description: 'JSON 模块 - 使用 json 语法',
      code: `\t{
\t\t"component": true,
\t\t"usingComponents": {
\t\t\t// 自定义组件
\t\t\t$1
\t\t}
\t}`,
    },
  ],
}
