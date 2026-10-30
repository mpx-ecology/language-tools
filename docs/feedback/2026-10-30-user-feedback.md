# 用户反馈归档（2026-10-30）

本文保留本轮反馈及截图索引，作为后续复现、排期和验收的输入。[问题分析与优化计划](../plans/2026-10-30-language-tools-optimization.md)单独维护。

反馈尚未逐项在用户环境复现。截图展示的诊断、颜色或跳转结果属于现象记录，不等于已确认的插件缺陷；截图中的代码、文字和 AI 解释均作为分析材料。

## 修复进度（2026-10-30）

归档文档与仓库工作流已通过 [PR #121](https://github.com/mpx-ecology/language-tools/pull/121) 合并，进度跟踪表已通过 [PR #123](https://github.com/mpx-ecology/language-tools/pull/123) 合并。问题修复按拆分后的 T01–T18 分别跟踪，完整状态见[优化计划的进度表](../plans/2026-10-30-language-tools-optimization.md#31-修复进度与并行安排2026-10-30)。

| 反馈范围                                   | 当前状态                       | 关联记录与后续动作                                                                                                                                                                                                                                                                                |
| ------------------------------------------ | ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| U10 / T17：Vue 共存时的 `defineProps` 误报 | PR 中，尚未合并；F5 验收待执行 | [Issue #119](https://github.com/mpx-ecology/language-tools/issues/119) → [PR #120](https://github.com/mpx-ecology/language-tools/pull/120)；PR 最新验证记录为 132 项专项回归、166 项全量测试及 build / lint 通过。初轮排查见[排查记录](2026-10-30-vue-macro-coexistence.md)，后续修订以 PR 为准。 |
| T01（U01 / U02 的样式指令部分）            | PR 中，待合并（F5 视觉已通过） | [Issue #127](https://github.com/mpx-ecology/language-tools/issues/127) → [PR #130](https://github.com/mpx-ecology/language-tools/pull/130)；专项 68 项、全量 102 项及实际补全 provider 验证通过；五种样式块的 F5 颜色、scope 与边界验收均已通过。                                                 |
| T08（U05 / U06 的 class 部分）             | PR 中，待合并                  | [Issue #126](https://github.com/mpx-ecology/language-tools/issues/126) → [PR #129](https://github.com/mpx-ecology/language-tools/pull/129)；专项 31 项、全量 65 项及实际导航 / hover / 补全 provider 验证通过。                                                                                   |
| 其余 15 项：T02–T07、T09–T16、T18          | 待启动                         | 已完成初步源码分析，按复现结果与依赖分别启动；U02、U06 的其余能力仍单独跟踪。                                                                                                                                                                                                                     |

“PR 中”表示实现已提交评审；合并、F5 验收和随版本发布分别记录。准备并行推进的条目，在实际开工后再改为“修复中”。

## 原始反馈

以下沿用用户编号，仅调整换行。

| 编号 | 用户反馈                                                                                                                                                                                                                    | 对应截图                                               |
| ---- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------ |
| U01  | 一些语法高亮？补全提示                                                                                                                                                                                                      | S01、S02                                               |
| U02  | 语法高亮，包括 mpxTagName 里面的标签解析                                                                                                                                                                                    | 无独立截图；S01～S03 可作相关背景                      |
| U03  | RN 组件的识别和跳转，支持多平台的引用查找，还有反向查找引用，直接调用组件的自动导入 usingComponent                                                                                                                          | S03、S04；S05 的准确归属待确认                         |
| U04  | refs 的类型解析                                                                                                                                                                                                             | S06                                                    |
| U05  | 复杂 class 的点击跳转                                                                                                                                                                                                       | S07                                                    |
| U06  | 写 template 的时候，要补全全局的组件，自动导入；写 class 要补全 style 里面的 class 名字；写 style 补全 css 属性；写变量补全 props / defineExpose / onReactHooks 里面的；补全一些 mpx / wx / rn 标签的内置属性、绑定事件这些 | 与 S03、S07 相关，无完整补全菜单截图                   |
| U07  | 组件的 json 也是缺失类型提示                                                                                                                                                                                                | S08                                                    |
| U08  | 自动闭合标签 / 自动重命名标签                                                                                                                                                                                               | 无截图                                                 |
| U09  | props、defineExpose 的内容、onReactHooksExec 的返回值有重名应该发出警告，导出叫 data 的变量应该发出警告                                                                                                                     | 无截图                                                 |
| U10  | 和 vue 插件共同启用时，defineProps 的写法有很多会报错（AI 说是 mpx 和 vue 都注入修改了 tsserver 里面的类型导致的）                                                                                                          | 无截图或错误文本；括号内为用户转述的 AI 假设，尚未证实 |

分析时统一使用配置字段 `usingComponents`；U06 的 `onReactHooks` 暂按仓库支持的 `onReactHooksExec` 理解，若指其他 API，需要另补样例。U09 的“导出”暂按暴露到组件实例理解，不能据此禁止所有名为 `data` 的局部变量或模块导出。

## 截图索引与可观察事实

图片按用户附件顺序归档。S01、S02 为同一段样式代码的局部图和带反馈文字的截图，计为一个反馈案例，不重复计算。

| 截图 | 归档文件                                             | 可观察事实与不能直接下的结论                                                                                                                                                                                                                   |
| ---- | ---------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| S01  | `assets/2026-10-30/01-style-directives.jpg`          | 样式块含 `/* @mpx-if (__ISRN__) */`、`@mpx-else`、`@mpx-endif`。具体缺少的是高亮、指令补全还是条件变量补全，需分别验收。                                                                                                                       |
| S02  | `assets/2026-10-30/02-style-directives-feedback.png` | S01 对应的反馈上下文：“一些语法高亮？补全提示”。图上的颜色不能单独证明当前插件能力。                                                                                                                                                           |
| S03  | `assets/2026-10-30/03-rn-component-registration.jpg` | 模板使用 `NativeView` 和 `onLayout="{{ handleFooterLayout }}"`；脚本从 `react-native` 导入 `View`，在 `defineOptions({ components: { NativeView: View } })` 注册别名。需要贯通标签、RN props、事件回调类型和源码跳转。                         |
| S04  | `assets/2026-10-30/04-platform-definitions.jpg`      | `Masonry` 的定义列表出现 `index.ios.mpx`、`index.mpx` 两个候选。可能是合理多候选，也可能是平台选择或去重问题；不能仅据此认定“重复定义”。                                                                                                       |
| S05  | `assets/2026-10-30/05-required-prop-diagnostic.jpg`  | `SceneTagBar` 上显示“组件 <SceneTagBar> 缺少必传属性：tags”，同时存在 `wx:if` 与 `bind:change`。缺少组件定义、完整调用和期望描述，暂不能判断是否误报。                                                                                         |
| S06  | `assets/2026-10-30/06-refs-inference.jpg`            | `const { refs } = useContext()` 的 hover 显示 `searchResultListRef: __MpxComponentRef0`，后续调用 `refs.searchResultListRef.loadMoreMerchants()`。展示内部类型名本身不等于方法类型错误，需要检查方法补全、参数、返回值和跳转。                 |
| S07  | `assets/2026-10-30/07-dynamic-class-navigation.jpg`  | 同时使用静态 `class="media-preview-indicator"` 和 `wx:class="{{ { 'is-solo': !titleText } }}"`，箭头指向动态对象的类名 key。需区分类名跳转与 `titleText` 变量跳转。                                                                            |
| S08  | `assets/2026-10-30/08-component-json-hover.jpg`      | `<script type="application/json">` 中 `component` 已显示 `boolean`、说明及配置文档链接，存在 `usingComponents`。该图可作为期望效果或已有部分能力的证据，不能证明 JSON 提示完全缺失。路径里的 `.vue` 仅保留为截图内容，不自动扩展本轮支持范围。 |

## 截图保存范围

截图可能包含内网信息，仅保留在原始整理工作区的 `docs/feedback/assets/2026-10-30/`，不纳入 Git 提交。上表路径为本地归档位置，不作为仓库资源链接；本文不嵌入图片预览。该目录已加入仅本地生效的 Git exclude，克隆仓库后不会包含原图。

## 后续复现应补齐的信息

无需等待这些资料才开始源码分析；进入具体修复前，相关条目应补上：

- VS Code、Mpx 插件、Vue 插件、项目 TypeScript、`@mpxjs/core` 版本，以及实际使用的 TS SDK。
- 相关 `.mpx` 最小样例、子组件声明、`tsconfig`、组件注册方式和目标平台；避免只保留报错的一行。
- 错误 code、完整诊断文本，以及“实际行为 / 期望行为”；S05 尤其需要说明 `tags` 是否必传、是否有平台后缀传参。
- U10 的单独启用 Mpx、单独启用 Vue、共同启用三组结果，文件后缀及所属项目；必要时提供脱敏 tsserver 日志。
- U04 的目标方法签名、`wx:ref` 声明、子组件 `defineExpose` / options，以及循环或条件渲染场景。
- U06 的“全局组件”来源：应用 JSON、类型扩展、框架配置或工作区尚未注册的组件。
