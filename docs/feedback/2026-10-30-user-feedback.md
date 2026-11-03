# 用户反馈归档（2026-10-30）

本文保留本轮反馈及截图索引，作为后续复现、排期和验收的输入。[问题分析与优化计划](../plans/2026-10-30-language-tools-optimization.md)单独维护。

反馈尚未逐项在用户环境复现。截图展示的诊断、颜色或跳转结果属于现象记录，不等于已确认的插件缺陷；截图中的代码、文字和 AI 解释均作为分析材料。

## 修复进度（2026-11-03）

归档与跟踪基础文档已通过 [PR #121](https://github.com/mpx-ecology/language-tools/pull/121)、[PR #123](https://github.com/mpx-ecology/language-tools/pull/123) 合并。本轮更新集中在 [PR #131](https://github.com/mpx-ecology/language-tools/pull/131)；各项 Issue、分支、PR、负责会话及验收边界见[优化计划的进度表](../plans/2026-10-30-language-tools-optimization.md#31-修复进度与并行安排2026-10-30)。保留 T01–T18 编号，原 T18 按用户更正合并到 T10 / T11，共 17 个独立工作项。

| 反馈范围                                                               | 当前状态                              | 关联记录与后续动作                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| ---------------------------------------------------------------------- | ------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| U01 / U02 样式指令 T01；U05 / U06 class T08；U10 Vue 共存 T17          | 已合并；已有宿主验收记录              | 分别为 #127 → [PR #130](https://github.com/mpx-ecology/language-tools/pull/130)、#126 → [PR #129](https://github.com/mpx-ecology/language-tools/pull/129)、#119 → [PR #120](https://github.com/mpx-ecology/language-tools/pull/120)。保留合并前最终验证记录和截图索引，未登记发布版本。                                                                                                                                                                                                                                                                                                                                                                                             |
| U06 模板变量、内置属性与事件 T10 / T11；更正汇总 T18                   | 已合并；F5 验收通过                   | #140 / #141 → [PR #143](https://github.com/mpx-ecology/language-tools/pull/143)，2026-11-03 合并；专项 129 项、全量 421 项及 build / lint、真实编译与 Extension Host 验证通过。T18 不再单独实现 CSS 补全。                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| U02 / U03 / U04 组件身份、RN、平台、反向引用、自动注册与 refs：T02–T07 | 六个独立 PR 中                        | #145 → [#166](https://github.com/mpx-ecology/language-tools/pull/166)、#151 → [#159](https://github.com/mpx-ecology/language-tools/pull/159)、#148 → [#167](https://github.com/mpx-ecology/language-tools/pull/167)、#149 → [#163](https://github.com/mpx-ecology/language-tools/pull/163)、#146 → [#165](https://github.com/mpx-ecology/language-tools/pull/165)、#155 → [#162](https://github.com/mpx-ecology/language-tools/pull/162)。已分别复现、实现和自动化验证；T02 已完成真实 F5 前后图上传及 Issue/PR 正文嵌入（2026-11-03 16:42）；T03 已有有效基线图，其余图和附件按串行队列续办。T04 已改为无需活动平台配置的方案，最新 609 项全量通过，旧方案 UI 记录不作为当前验收。 |
| U06 已注册全局组件 T09                                                 | PR 中；宿主 provider 通过，截图待补   | #150 → [PR #164](https://github.com/mpx-ecology/language-tools/pull/164)；应用 / 类型扩展来源、局部覆盖和刷新已验证，未混入未注册工作区候选。                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| U07 静态组件 JSON T12                                                  | PR 中；宿主 API 通过，截图待补        | #153 → [PR #157](https://github.com/mpx-ecology/language-tools/pull/157)；已有 component / 路径功能正常，补 componentGenerics 和嵌套值约束。                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| U07 动态 JSON T13                                                      | JS 语义已合并；配置 Schema 草稿 PR 中 | #138 → [PR #142](https://github.com/mpx-ecology/language-tools/pull/142) 已合并；配置提示 #154 → [PR #160](https://github.com/mpx-ecology/language-tools/pull/160) 已同步 main 并更改 base，624 项全量通过，仍为 Draft，最新 Test / autofix 已通过，待 F5 / 截图后转 ready。不能把通用 JS 语义当作完整 Schema 提示。                                                                                                                                                                                                                                                                                                                                                                |
| U08 标签闭合与联动 T14                                                 | 未复现运行时缺陷；回归 PR 已合并      | [PR #156](https://github.com/mpx-ecology/language-tools/pull/156)，2026-11-03 合并；29 项专项、502 项全量和真实宿主输入 / provider 验证通过，仅增加测试与自包含场景，无修复前后差异。                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| U09 实例字段重名 T15、data 保留名 T16                                  | 两个 PR 中；F5 UI / 截图待补          | #147 → [PR #158](https://github.com/mpx-ecology/language-tools/pull/158)、#152 → [PR #161](https://github.com/mpx-ecology/language-tools/pull/161)。T15 的 CI 集成问题已修复，最新 Test / autofix 通过；仅警告静态可确认的实例公开字段，普通局部 / 模块导出 data 保留；诊断码统一 #168 → [草稿 PR #169](https://github.com/mpx-ecology/language-tools/pull/169) 独立跟进，31 项专项、615 项全量通过，截图待补。                                                                                                                                                                                                                                                                     |

2026-11-03 已按“一项一会话”启动 12 个剩余范围，全部形成 PR；其中 T14 已合并，其他 11 项仍在评审或集成阶段。状态为本次核对快照，测试数来自各 PR 的独立基线，不能相加。合并、真实宿主 API、F5 视觉截图及随版本发布分别登记；未完成的验证不写成通过。

15:43（Asia/Shanghai）恢复快照：用户已亲自为 Code - Insiders 选择 Always allow，继续推进指令已送达 12 个相关会话。F5 截图及所有截图附件上传继续通过共享锁串行执行；其他会话在锁外测试与整理正文。截图的本地采集、附件上传和正文嵌入分别登记，详见[截图与上传快照](../plans/2026-10-30-language-tools-optimization.md#33-f5-截图与上传快照2026-11-03)。#142 原有四张修复后图不等于完整 before/after。

最新单项交付：T02 的 [Issue #145](https://github.com/mpx-ecology/language-tools/issues/145) 已嵌入[复现图](https://github.com/user-attachments/assets/d7919e93-5a47-447b-bf8f-9e42218341a3)，[PR #166](https://github.com/mpx-ecology/language-tools/pull/166) 已嵌入同场景[修复后图](https://github.com/user-attachments/assets/d8dfe805-6f03-48c9-9ea5-4fff4e40e08c)与前图。协调核验两附件与已核准原图字节一致、错误数 0 → 2、拍摄配置 head 39d85ef 的 Test / autofix 成功；2026-11-03 21:39 另核验主线集成 head 18ab7cc2142c144038c1eb9e764018d42f0b2b86 的 Test / autofix 成功，115 项专项、637 项全量及 build / lint / 扩展构建通过。本次未重拍 F5，原截图保留真实拍摄版本；PR 仍待评审批准。完整版本与时间见[逐项证据交付记录](../plans/2026-10-30-language-tools-optimization.md#34-逐项证据交付记录)。每完成一项继续单独更新，另按用户要求每 5 分钟汇报各会话进度。

截图默认要求已同步各修复会话并写入仓库规范：Issue 附实际 F5 最小 inspect 场景的复现截图，PR 附同场景、设置和主题的修复前后截图。只有无法或无需 F5 验证时可省略，需在 Issue / PR 说明具体原因及替代证据；本轮待补项仍按待补跟进。截图上传 GitHub 附件，原始内部截图继续只保留本地。

## 原始反馈

以下沿用用户编号；U06 已按用户 2026-11-02 的更正更新，其余仅调整换行。

| 编号 | 用户反馈                                                                                                                                                                                            | 对应截图                                               |
| ---- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------ |
| U01  | 一些语法高亮？补全提示                                                                                                                                                                              | S01、S02                                               |
| U02  | 语法高亮，包括 mpxTagName 里面的标签解析                                                                                                                                                            | 无独立截图；S01～S03 可作相关背景                      |
| U03  | RN 组件的识别和跳转，支持多平台的引用查找，还有反向查找引用，直接调用组件的自动导入 usingComponent                                                                                                  | S03、S04；S05 的准确归属待确认                         |
| U04  | refs 的类型解析                                                                                                                                                                                     | S06                                                    |
| U05  | 复杂 class 的点击跳转                                                                                                                                                                               | S07                                                    |
| U06  | 写 template 的时候，要补全全局的组件，自动导入；写 class 要补全 style 里面的 class 名字；写变量补全 props / defineExpose / onReactHooks 里面的；补全一些 mpx / wx / rn 标签的内置属性、绑定事件这些 | 与 S03、S07 相关，无完整补全菜单截图                   |
| U07  | 组件的 json 也是缺失类型提示                                                                                                                                                                        | S08                                                    |
| U08  | 自动闭合标签 / 自动重命名标签                                                                                                                                                                       | 无截图                                                 |
| U09  | props、defineExpose 的内容、onReactHooksExec 的返回值有重名应该发出警告，导出叫 data 的变量应该发出警告                                                                                             | 无截图                                                 |
| U10  | 和 vue 插件共同启用时，defineProps 的写法有很多会报错（AI 说是 mpx 和 vue 都注入修改了 tsserver 里面的类型导致的）                                                                                  | 无截图或错误文本；括号内为用户转述的 AI 假设，尚未证实 |

2026-11-02 更正：原“CSS 属性补全”改为模板变量以及 mpx / wx / rn 标签内置属性与事件绑定补全，分别归 T10 / T11；T18 保留为合并记录，不独立排期。

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
