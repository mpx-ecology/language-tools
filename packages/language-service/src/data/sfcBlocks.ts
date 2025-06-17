import type * as html from 'vscode-html-languageservice'

const mpxDocs = 'Mpx 官方文档'
const wxDocs = '微信小程序官方文档'

const data: html.HTMLDataV1 = {
  version: 1.0,
  tags: [
    {
      name: 'template',
      attributes: [
        {
          name: 'src',
          description: {
            kind: 'markdown',
            value:
              '模板引用-定义\n\n在当前文件中定义了一个叫 `name` 的 `template`，比如：\n\n```html\n<template name="item">\n  <text>{{text}}</text>\n</template>\n```\n\n',
          },
          references: [
            {
              name: wxDocs,
              url: 'https://developers.weixin.qq.com/miniprogram/dev/reference/wxml/import.html',
            },
          ],
        },
        {
          name: 'is',
          description: {
            kind: 'markdown',
            value:
              '模板引用-使用\n\n在当前模板中引用了名为 `item` 的模板后就可以使用该模板，比如：\n\n```html\n<template is="item" data="{{text: \'forbar\'}}"/>\n```\n',
          },
          references: [
            {
              name: wxDocs,
              url: 'https://developers.weixin.qq.com/miniprogram/dev/reference/wxml/import.html',
            },
          ],
        },
      ],
      description: {
        kind: 'markdown',
        value: '\n`<template>` 模板模块\n',
      },
      references: [
        { name: mpxDocs, url: 'https://mpxjs.cn/guide/basic/template.html' },
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
              '如果你更喜欢将 `*.vue` 组件分散到多个文件中，可以为一个语块使用 `src` 这个 attribute 来导入一个外部文件：\n\n```html\n<script src="./script.js"></script>\n```\n\n',
          },
          references: [
            {
              name: mpxDocs,
              url: 'https://mpxjs.cn/guide/tool/ts.html#mpx%E4%B8%AD%E7%BC%96%E5%86%99ts-%E6%8E%A8%E8%8D%90',
            },
          ],
        },
        {
          name: 'lang',
          description: {
            kind: 'markdown',
            value:
              '代码块 script 可以使用 `lang` 来声明预处理器语言，比如：\n\n```html\n<script lang="ts">\n  // use TypeScript\n</script>\n```\n\n',
          },
          values: [
            {
              name: 'ts',
            },
            {
              name: 'js',
            },
          ],
          references: [
            {
              name: mpxDocs,
              url: 'https://mpxjs.cn/guide/tool/ts.html#mpx%E4%B8%AD%E7%BC%96%E5%86%99ts-%E6%8E%A8%E8%8D%90',
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
              name: mpxDocs,
              url: 'https://mpxjs.cn/guide/composition-api/composition-api.html#script-setup',
            },
          ],
        },
      ],
      description: {
        kind: 'markdown',
        value: '\n`<script>` 逻辑模块\n',
      },
      references: [],
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
          name: mpxDocs,
          url: 'https://mpxjs.cn/guide/composition-api/composition-api.html#script-setup',
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
              name: mpxDocs,
              url: 'https://mpxjs.cn/guide/basic/css.html#style-src-%E5%A4%8D%E7%94%A8',
            },
          ],
        },
        {
          name: 'lang',
          description: {
            kind: 'markdown',
            value:
              '`<style>` 模块可以使用 `lang` 这个 attribute 来声明 style 预处理器语言。',
          },
          values: [
            {
              name: 'css',
            },
            {
              name: 'scss',
            },
            {
              name: 'less',
            },
            {
              name: 'stylus',
            },
            {
              name: 'postcss',
            },
            {
              name: 'sass',
            },
          ],
          references: [
            {
              name: mpxDocs,
              url: 'https://mpxjs.cn/guide/basic/css.html#css-%E9%A2%84%E7%BC%96%E8%AF%91',
            },
          ],
        },
        {
          name: 'scoped',
          valueSet: 'v',
          description: {
            kind: 'markdown',
            value:
              '当 `<style>` 标签带有 `scoped` attribute 的时候，它的 CSS 只会影响当前组件的元素。',
          },
          references: [
            {
              name: mpxDocs,
              url: 'https://mpxjs.cn/guide/basic/css.html',
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
              name: mpxDocs,
              url: 'https://mpxjs.cn/guide/basic/css.html',
            },
          ],
        },
      ],
      description: {
        kind: 'markdown',
        value: '\n`<style>` 样式模块\n',
      },
      references: [
        {
          name: mpxDocs,
          url: 'https://mpxjs.cn/guide/basic/css.html',
        },
      ],
    },
  ],
}

export default data
