# Mpx Language Tools

<div align="center">
<!-- etc. download icon -->
</div>

> 🚧 **Work in Progress**

## Why new Extension?

### Background

旧版插件 [vscode-mpx] 基于 Vue 2 的 [Vetur] 实现，目前维护不活跃，且存在功能局限性。随着 Vue 3 转向基于 [Volar] 的新插件 [Vue - Official][vue-official]，我们决定全新打造基于 [Volar] 的 Mpx 新版插件，提供更丰富的语言特性和更流畅的开发体验，以满足现代 Mpx 项目需求。

### Feature Comparison

| Feature                                 | Legacy | New         |
| --------------------------------------- | ------ | ----------- |
| 语法高亮                                | ✅     | ✅          |
| Emmet 支持                              | ✅     | ✅          |
| \<template\> 支持 TS 类型检查、补全提示 | ❌     | ✅          |
| \<template\> 支持定义跳转、查找参考引用 | ❌     | ✅          |
| \<template\> 样式类名跳转 \<style\>     | ❌     | ✅          |
| \<template\> 自定义组件跳转             | ❌     | in Progress |
| \<script ts\> 支持关联 tsconfig 配置    | ❌     | ✅          |
| 拆分 SFC 编辑器视图                     | ❌     | ✅          |
| SFC block 标签属性补全、hover 提示      | ❌     | ✅          |
| 标签属性补全提示 (wx:xxx)               | ✅     | in Progress |
| 格式化 formatter                        | ✅     | in Progress |
| 代码片段 snippets                       | ✅     | in Progress |

### Performance

除了功能增强之外，新版本插件针对包体积和性能都进行了全面优化。

## Core Packages

| Package                                  | Version                | Description            |
| ---------------------------------------- | ---------------------- | ---------------------- |
| [`mpx-vscode`][mpx-vscode-readme]        | ![npm][mpx-vscode-npm] | VS Code extension      |
| [`@mpxjs/language-server`][server-pkg]   | ![npm][server-npm]     | Language server        |
| [`@mpxjs/language-service`][service-pkg] | ![npm][service-npm]    | Language service layer |
| [`@mpxjs/language-core`][core-pkg]       | ![npm][core-npm]       | Language core layer    |
| [`@mpxjs/typescript-plugin`][ts-pkg]     | ![npm][ts-npm]         | TypeScript plugin      |
| [`@mpxjs/language-shared`][shared-pkg]   | ![npm][shared-npm]     | Shared utilities       |

## Dependency Flow

```mermaid
flowchart TD
  %% Define all packages
  shared[language-shared]
  core[language-core]
  typescript[typescript-plugin]
  service[language-service]
  server[language-server]
  vscode[vscode extension]

  %% Define dependencies
  shared --> core
  core --> typescript
  shared --> typescript
  core --> service
  shared --> service
  typescript --> service
  service --> server
  core --> server
  server --> vscode
  typescript -.-> vscode

  %% Styling
  classDef core fill:#d4f1f9
  classDef extension fill:#d5e8d4

  class shared,core,service,server core
  class vscode,inspect extension
```

## Dive In

For architecture details and source code documentation, please refer to our [deepwiki][mpx-deep-wiki].

## RoadMap

For details on our planned features and future direction, please refer to our [roadmap].

## Credits

- [vue-language-tools] & [volar], created and maintained by [Johnson Chu][johnsonchu].

<!-- Reference Links -->

[vscode-mpx]: https://marketplace.visualstudio.com/items?itemName=pagnkelly.mpx
[vetur]: https://github.com/vuejs/vetur
[volar]: https://github.com/volarjs/volar.js
[vue-official]: https://marketplace.visualstudio.com/items?itemName=Vue.volar
[vue-language-tools]: https://github.com/vuejs/language-tools
[mpx-deep-wiki]: https://deepwiki.com/mpx-ecology/language-tools
[roadmap]: TODO
[johnsonchu]: https://github.com/johnsoncodehk

<!-- Package Links -->

[mpx-vscode-readme]: vscode/README.md
[server-pkg]: packages/language-server
[service-pkg]: packages/language-service
[core-pkg]: packages/language-core
[ts-pkg]: packages/typescript-plugin
[shared-pkg]: packages/language-shared

<!-- NPM Badge Links -->

[mpx-vscode-npm]: https://img.shields.io/npm/v/@mpxjs/vscode-mpx
[server-npm]: https://img.shields.io/npm/v/@mpxjs/language-server
[service-npm]: https://img.shields.io/npm/v/@mpxjs/language-service
[core-npm]: https://img.shields.io/npm/v/@mpxjs/language-core
[ts-npm]: https://img.shields.io/npm/v/@mpxjs/typescript-plugin
[shared-npm]: https://img.shields.io/npm/v/@mpxjs/language-shared
