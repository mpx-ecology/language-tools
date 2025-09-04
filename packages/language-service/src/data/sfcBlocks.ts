import type * as html from 'vscode-html-languageservice'
import { MpxDocs, MpxGuideUrl } from './utils'

const jsonDescription =
  '\n\n- json 区块完全支持小程序原生的 [app.json 配置](https://developers.weixin.qq.com/miniprogram/dev/reference/configuration/app.html)，还额外支持了 packages 多人合作等增强特性。\n  - [使用分包](https://mpxjs.cn/guide/advance/subpackage.html)\n  - [分包异步化](https://mpxjs.cn/guide/advance/async-subpackage.html)\n- 同样支持原生的 [页面 json 配置](https://developers.weixin.qq.com/miniprogram/dev/reference/configuration/page.html)，此外，我们能够直接在 `usingComponents` 中填写 npm 地址引用 npm 包中的组件，mpx 组件和原生小程序组件均可引用，无需调用开发者工具 npm 编译，且能够通过依赖收集按需进行打包。\n\n'

const data: html.HTMLDataV1 = {
  version: 1.0,
  tags: [
    {
      name: 'template',
      attributes: [],
      description: {
        kind: 'markdown',
        value: '\n`<template>` 模板模块\n',
      },
      references: [
        { name: MpxDocs, url: `${MpxGuideUrl}/basic/template.html` },
      ],
    },
    {
      name: 'script',
      attributes: [
        {
          name: 'src',
          description: {
            kind: 'markdown',
            value:
              '如果你更喜欢将 `*.mpx` 的 js 逻辑代码分散到其他文件中，可以为一个语块使用 src 属性来导入一个外部文件，比如：\n\n```html\n<script src="./script.js"></script>\n```\n\n',
          },
          references: [
            {
              name: MpxDocs,
              url: `${MpxGuideUrl}/tool/ts.html#mpx%E4%B8%AD%E7%BC%96%E5%86%99ts-%E6%8E%A8%E8%8D%90`,
            },
          ],
        },
        {
          name: 'lang',
          valueSet: 't',
          values: [
            {
              name: 'ts',
            },
            {
              name: 'js',
            },
          ],
          description: {
            kind: 'markdown',
            value:
              '代码块 script 可以使用 lang 属性来声明预处理器语言，比如：\n\n```html\n<script lang="ts">\n  // use TypeScript\n</script>\n```\n\n',
          },
          references: [
            {
              name: MpxDocs,
              url: `${MpxGuideUrl}/tool/ts.html#mpx%E4%B8%AD%E7%BC%96%E5%86%99ts-%E6%8E%A8%E8%8D%90`,
            },
          ],
        },
        {
          name: 'setup',
          valueSet: 'v',
          description: {
            kind: 'markdown',
            value:
              '\n`<script setup>` 是在 Mpx 单文件组件中使用组合式 API 时的编译时语法糖，和 Vue 类似。\n',
          },
          references: [
            {
              name: MpxDocs,
              url: `${MpxGuideUrl}/composition-api/composition-api.html#script-setup`,
            },
          ],
        },
        {
          name: 'name',
          valueSet: 't',
          values: [
            {
              name: 'json',
            },
          ],
          description: {
            kind: 'markdown',
            value:
              '\n`<script type="application/json">` 区块对应小程序的 json 配置（使用 **js** 语法）。' +
              jsonDescription,
          },
          references: [
            {
              name: MpxDocs,
              url: `${MpxGuideUrl}/basic/start.html#%E5%BC%80%E5%A7%8Bcode`,
            },
          ],
        },
        {
          name: 'type',
          description: {
            kind: 'markdown',
            value:
              '\n`<script type="application/json">` 区块对应小程序的 json 配置（使用 **json** 语法）。' +
              jsonDescription,
          },
          valueSet: 't',
          values: [
            {
              name: 'application/json',
            },
          ],
          references: [
            {
              name: MpxDocs,
              url: `${MpxGuideUrl}/basic/start.html#%E5%BC%80%E5%A7%8Bcode`,
            },
          ],
        },
      ],
      description: {
        kind: 'markdown',
        value:
          '\n`<script>` 模块\n\n- `<script>/<script setup>` 模块对应 app.js 定义了全局逻辑，可以自由使用 ts/js 等 js 预编译语言。\n- `<script name="json">` 区块对应小程序的 json 配置（使用 js 语法）。\n- `<script type="application/json">` 区块对应小程序的 json 配置（使用 json 语法）。',
      },
      references: [
        {
          name: MpxDocs,
          url: `${MpxGuideUrl}/basic/start.html#%E5%BC%80%E5%A7%8Bcode`,
        },
      ],
    },
    {
      name: 'script setup',
      attributes: [],
      description: {
        kind: 'markdown',
        value:
          '\n`<script setup>` 是在 Mpx 单文件组件中使用组合式 API 时的编译时语法糖，和 Vue 类似。\n',
      },
      references: [
        {
          name: MpxDocs,
          url: `${MpxGuideUrl}/composition-api/composition-api.html#script-setup`,
        },
      ],
    },
    {
      name: 'style',
      attributes: [
        {
          name: 'src',
          description: {
            kind: 'markdown',
            value:
              '通过给 style 标签添加 src 属性引入外部样式，最终公共样式代码只会打包一份。',
          },
          references: [
            {
              name: MpxDocs,
              url: `${MpxGuideUrl}/basic/css.html#style-src-%E5%A4%8D%E7%94%A8`,
            },
          ],
        },
        {
          name: 'lang',
          description: {
            kind: 'markdown',
            value:
              '`<style>` 模块可以使用 lang 属性来声明 style 预处理器语言。',
          },
          valueSet: 't',
          values: [
            {
              name: 'stylus',
            },
            {
              name: 'css',
            },
            {
              name: 'less',
            },
            {
              name: 'sass',
            },
            {
              name: 'scss',
            },
            {
              name: 'postcss',
            },
          ],
          references: [
            {
              name: MpxDocs,
              url: `${MpxGuideUrl}/basic/css.html#css-%E9%A2%84%E7%BC%96%E8%AF%91`,
            },
          ],
        },
        {
          name: 'scoped',
          valueSet: 'v',
          description: {
            kind: 'markdown',
            value:
              '当 `<style>` 标签带有 scoped 属性的时候，它的 CSS 只会影响当前组件的元素。',
          },
          references: [
            {
              name: MpxDocs,
              url: `${MpxGuideUrl}/basic/css.html`,
            },
          ],
        },
        {
          name: 'mode',
          description: {
            kind: 'markdown',
            value: '`mode` 选项',
          },
          references: [
            {
              name: MpxDocs,
              url: `${MpxGuideUrl}/basic/css.html`,
            },
          ],
        },
      ],
      description: {
        kind: 'markdown',
        value:
          '\n`<style>` 样式模块\n\n- style 区块对应 app.wxss 定义了全局样式。\n- 可以自由使用 `sass/less/stylus` 等 css 预编译语言。',
      },
      references: [
        {
          name: MpxDocs,
          url: `${MpxGuideUrl}/basic/css.html`,
        },
      ],
    },
    {
      name: 'script name="json"',
      attributes: [],
      description: {
        kind: 'markdown',
        value:
          '\n`<script name="json">` 区块对应小程序的 json 配置（使用 **js** 语法）。',
      },
      references: [
        {
          name: MpxDocs,
          url: `${MpxGuideUrl}/basic/start.html#%E5%BC%80%E5%A7%8Bcode`,
        },
      ],
    },
    {
      name: 'script type="application/json"',
      attributes: [],
      description: {
        kind: 'markdown',
        value:
          '\n`<script type="application/json">` 区块对应小程序的 json 配置（使用 **js** 语法）。',
      },
      references: [
        {
          name: MpxDocs,
          url: `${MpxGuideUrl}/basic/start.html#%E5%BC%80%E5%A7%8Bcode`,
        },
      ],
    },
  ],
}

export default data
