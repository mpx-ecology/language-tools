# Mpx Language Tools 用户反馈分析与优化计划

初始分析日期：2026-10-30，基线为本仓库 `84c7cb3`、`vscode/package.json` 版本 `1.24.3`。进度更新至 2026-11-03：T01 / T08 / T17 已通过 #130 / #129 / #120 合并，T10 / T11 已通过 #143 合并；T14 未复现运行时缺陷，回归与验收 PR #156 已合并。T13 的通用 JSON JS 语义已通过 #142 合并，配置 Schema 提示继续由草稿 PR #160 跟进。尚未完成交付的 11 项实现均已提交 PR，逐项状态、负责会话与依赖见第 3.1 节。归档与跟踪基础文档已通过 [PR #121](https://github.com/mpx-ecology/language-tools/pull/121)、[PR #123](https://github.com/mpx-ecology/language-tools/pull/123) 合并；本轮进度及截图规范集中更新至 [PR #131](https://github.com/mpx-ecology/language-tools/pull/131)。已合并不等于已随版本发布，发布版本尚未在本文登记。

本轮原始 10 条反馈及 8 张截图索引见[反馈归档](../feedback/2026-10-30-user-feedback.md)。保留 T01–T18 跟踪编号。2026-11-02 用户更正 U06，原 T18“CSS 属性补全”合并至 T10 / T11，形成 17 个独立工作项；T18 只保留合并记录，不另开会话或计入成本。反馈中重复的补全、自动导入和 class 能力只计一次。

## 1. 判断与建议顺序

优先处理类型服务稳定性，再补组件识别与类型链路，最后扩展全局查找和自动注册。

1. **Vue 共存修复已通过 PR #120 合并。** 已确认并修复 Vue 2.7 与 Mpx 同名全局宏的绑定冲突，合并前 Extension Host 检查通过。后续类型改动基于该实现补共存回归；其他版本或未覆盖的编辑器组合继续按实际复现跟踪。
2. **RN 组件注册、多平台解析、refs 是主要基础缺口。** 它们会同时影响补全、hover、诊断、导航和引用，应围绕同一组件身份与类型来源修复。
3. **动态 class、静态 JSON 和标签编辑适合独立交付。** 多数已有服务入口，先定位覆盖范围或接线问题，避免重做已有能力。
4. **自动注册与反向引用依赖稳定的组件解析。** 先明确平台、别名、全局注册与局部注册规则，再决定是否需要新索引，避免先建一套与现有 TS 解析不一致的系统。
5. **新增警告要对准真实的实例冲突。** 保留普通局部变量 `data`；不能通过放宽为 `any`、全局关闭诊断或屏蔽导航来消除反馈。

这里区分三类结论：**源码确认**表示已定位当前实现或明确缺口；**推断**表示有源码依据但尚未完成端到端复现；**待复现**表示缺少输入或无法仅凭截图判断。源码确认不代表已在用户版本复现。

## 2. 现有能力与代码证据

本节及第 3 节工作项表保留 2026-10-30 初始基线的源码判断与估算，用于解释立项原因；其中的缺口描述不代表当前主分支仍有相同问题。最新交付状态与验证证据以第 3.1 / 3.2 节及对应 PR 为准。

| 证据 | 已核对的实现                                                                                                                                                                                                                                                                                     | 对计划的含义                                                                                                                                             |
| ---- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| E01  | [TextMate 语法](../../vscode/syntaxes/mpx.tmLanguage.json)已按样式语言嵌入 grammar；未检索到 `mpxTagName` 和样式 `@mpx-if` 专用语法规则。                                                                                                                                                        | 基础高亮存在；条件注释高亮与标签值语义需单独补足。主题最终颜色仍需 F5 检查。                                                                             |
| E02  | [样式指令补全](../../packages/language-service/src/plugins/mpx-sfc-style-directive-comments.ts)支持 `mpx-if / elif / else / endif`，但触发条件是行首空白后只有 `@`，即 `/^\s*@$/`。                                                                                                              | `/* @`、输入中的 `@mpx-`、条件表达式变量没有被这个补全入口覆盖。                                                                                         |
| E03  | [模板上下文](../../packages/language-core/src/codegen/script/template.ts)合并 props、expose、options、Hooks 返回值；组件集合来自 `typeof __MPX_ctx`、JSON 组件与 `GlobalComponents`。                                                                                                            | 变量类型链路已存在；未见将 options 的 `components` 注册表明确展开进模板组件集合的实现。RN 注册别名需重点验证。                                           |
| E04  | [setup 解析](../../packages/language-core/src/parsers/scriptSetupRanges.ts)和[代码生成](../../packages/language-core/src/codegen/script/scriptSetup.ts)处理 `defineProps / defineExpose / defineOptions / onReactHooksExec`。                                                                    | U06 不能按“这些 API 完全没有支持”立项；应覆盖泛型、解构、Ref、间接表达式与映射。解析器目前仅保存一个 `onReactHooksExec` 调用记录，多次注册行为需另核对。 |
| E05  | [路径解析入口](../../packages/language-core/src/utils/formatUsingComponentsPath.ts)明确留有 `.ios.mpx / .ali.mpx` 条件后缀未支持的 TODO；[resolver](../../packages/language-core/src/utils/resolve.ts)扩展名为 `.mpx / .js`，且入口会去除 query。                                                | 多平台选择是明确缺口；必须区分显式指定平台文件、平台后缀自动选择和 JSON 多路径候选。                                                                     |
| E06  | [模板链接与定义](../../packages/language-service/src/plugins/mpx-sfc-template-links.ts)基于 JSON 组件及 `templateNodeTags`，提供 document links / definition；其中候选按原始路径文本去重。                                                                                                       | 已有正向跳转；同一实际文件的不同路径仍需测试。RN 注册表与反向引用不能由这个 provider 自动保证。                                                          |
| E07  | [TS 模板元素生成](../../packages/language-core/src/codegen/template/element.ts)含导航和 only-import completion 映射；[TS 代理](../../packages/typescript-plugin/src/common.ts)处理自动 import 和补全名称。                                                                                       | 不能说当前完全没有引用或自动导入支持；尚未见把模板补全落成 `usingComponents` 注册编辑的完整链路。                                                        |
| E08  | [模板 refs 生成](../../packages/language-core/src/codegen/template/index.ts)中 `generateTemplateRefs` 及 `$refs` 输出处于注释状态；[组件导出](../../packages/language-core/src/codegen/script/componentSelf.ts)在 setup 下保留 expose 类型。                                                     | 子组件公开类型有基础，模板 ref → 子组件实例 → `useContext().refs` 的完整推断尚未闭合。不能仅恢复注释代码就宣称支持 Mpx refs。                            |
| E09  | [class 收集](../../packages/language-core/src/codegen/template/styleScopedClasses.ts)对 ATTRIBUTE 的 `class / wx:class` 先屏蔽 Mustache；另有 DIRECTIVE `class` 的对象 / 数组 / 字符串解析。                                                                                                     | S07 的 `wx:class` Mustache 对象不会直接进入后一个 AST 分支，存在遗漏静态类名 key 的明确路径。                                                            |
| E10  | [模板补全服务](../../packages/language-service/src/plugins/mpx-sfc-template.ts)的自定义 HTML data 主要来自当前 JSON 注册表及组件 props；[组件名请求](../../packages/typescript-plugin/src/requests/getComponentNames.ts)可读取 `__VLS_components`。                                              | 类型侧已考虑全局组件，不等于 HTML 标签补全已覆盖应用全局注册或全工作区候选。需复用并统一来源。                                                           |
| E11  | [模板数据](../../packages/language-service/src/data/template.ts)已有 Mpx / 微信 / RN 属性和事件说明；[全局类型入口](../../packages/language-core/src/codegen/globalTypes/index.ts)引用[内建组件类型](../../packages/language-core/src/codegen/globalTypes/nativeComponentsTypes.ts)。            | 内建补全与 TS 校验是两套数据面，需检查一致性、目标平台与缺失项，不能仅新增一批补全文案。                                                                 |
| E12  | [CSS 服务](../../packages/language-service/src/plugins/mpx-sfc-style-css.ts)复用 `volar-service-css`，[Stylus 服务](../../packages/language-service/src/plugins/mpx-sfc-style-stylus.ts)单独处理；[inline CSS](../../packages/language-core/src/plugins/mpx-template-inline-css.ts)也已有入口。  | 标准 CSS 属性补全已接入；2026-11-02 更正后不作为本轮独立需求，模板变量和标签补全分别见 T10 / T11。                                                       |
| E13  | [JSON 服务](../../packages/language-service/src/plugins/mpx-sfc-json-json.ts)注册 Schema，[Schema](../../packages/language-service/src/data/mpxJsonSchema.ts)含 `component`、`usingComponents` 和部分页面配置；[服务注册](../../packages/language-service/src/index.ts)未启用 JSON-JS 专用插件。 | 静态 JSON 是覆盖与激活排查；动态 JS 配置缺少专用配置类型服务，不等于 JS 语法完全无支持。                                                                 |
| E14  | [客户端](../../vscode/src/languageClient.ts)调用 `activateAutoInsertion`，模板服务继承 HTML provider。当前安装的 `volar-service-html@0.0.70` 提供 auto insertion 和 linked editing，分别读取 `html.autoClosingTags` 等配置。                                                                     | 标签闭合和联动重命名已有底层能力；需检查协商、映射与 `editor.linkedEditing`，不能只添加括号规则。依赖实现只作为本地只读检查证据。                        |
| E15  | [上下文生成](../../packages/language-core/src/codegen/script/template.ts)用对象展开合并字段；[全局类型](../../packages/language-core/src/codegen/globalTypes/index.ts)使用 `declare global` 和大量 `__VLS_*` 名称。                                                                              | 展开覆盖不会自动产生业务期望的重名警告；共享全局命名与 Vue 共存是否冲突需要隔离实验。                                                                    |
| E16  | [扩展激活](../../vscode/src/client.ts)拦截 `fs.readFileSync`，按内置 TS 扩展打包字符串做兼容补丁；[TS 插件](../../packages/typescript-plugin/src/index.ts)装饰语言服务，[声明配置](../../vscode/package.json)包含 TS 插件注册。                                                                  | 共存风险面包括宏声明、全局 helper、host 装饰和客户端补丁；目前没有证据足以锁定单一根因。                                                                 |

框架语义还只读参考了相邻 `mpx-core` 仓库 `daac8230c`：`packages/core/@types/index.d.ts` 的 Context / 全局宏声明，`packages/core/src/core/proxy.js` 的冲突处理，`packages/core/src/index.js` 的保留名，以及 `getDefaultOptions.ios.js` 的 Hooks 返回值合并。该源码不随本文归档，实施时需再与复现项目安装版本核对。RN 注册方式同时参考了本地 mpx2rn 技能的混合开发说明。

## 3. 工作项、优先级与成本

P0：已复现且阻断基础编辑的兼容性问题；本轮 T17 的修复已通过 PR #120 合并。P1：高频能力缺口或可能造成类型 / 导航错误。P2：能力扩展、较低阻断问题或依赖前序基础的增强。优先级与实施难度分开评估，低成本项目可独立先交付。

成本为熟悉仓库的单名工程师的有效人日，包含对应 fixture、关键自动化断言和手动场景准备；不含等待用户样例、外部依赖修复和大规模架构迁移。区间是初估，完成复现后再调整。影响成本除代码量外，还包括诊断、映射、性能和其他平台回归。

| 工作项 | 范围 / 反馈来源                                               | 判断                                             | 优先级       | 人日   | 主要改动层与影响成本                                                                            |
| ------ | ------------------------------------------------------------- | ------------------------------------------------ | ------------ | ------ | ----------------------------------------------------------------------------------------------- |
| T01    | 样式条件编译高亮与指令补全（U01、U02）                        | 部分已有；触发覆盖缺口源码确认                   | P2           | 1–2    | vscode grammar、language-service；低。需避免破坏 CSS / Stylus 注释边界。                        |
| T02    | `mpxTagName` 标签值的语义与高亮（U02）                        | 专用处理缺口源码确认；具体样例待复现             | P1           | 3–5    | language-core、service、TS plugin、grammar；高。标签身份与源码 range 会影响所有模板能力。       |
| T03    | RN `components` 注册别名、props、事件和导航（U03、U06 / S03） | 注册表与 React 类型接入不足为源码推断            | P1           | 4–7    | language-core、TS plugin、service；高。React 函数 / 类 / forwardRef 类型与 Mpx 类型需兼容。     |
| T04    | 多平台组件解析与正向跳转（U03 / S04）                         | 后缀自动解析缺口源码确认；两处定义是否异常待复现 | P1           | 4–6    | core resolver、生成 import、definition；高。影响类型候选、路径补全与缓存。                      |
| T05    | 从组件查使用方及多平台反向引用（U03）                         | TS 映射已有；端到端覆盖待测                      | P2           | 5–8    | core navigation、TS plugin，必要时 service 索引；高。跨文件性能、路径去重和动态配置边界。       |
| T06    | 模板候选接受后自动写入 `usingComponents`（U03、U06）          | TS import 有基础；JSON 注册链路缺口源码确认      | P2           | 4–7    | completion resolve / code action、配置 AST 编辑；高。跨区块编辑、撤销、动态配置及路径风格。     |
| T07    | `useContext().refs` 精确实例类型（U04 / S06）                 | refs 生成缺口源码确认；截图方法行为待复现        | P1           | 5–8    | core ref 元数据、组件公开类型、脚本映射；高。空值、数组、RN 与多平台实例类型。                  |
| T08    | 动态 class 跳转及 class 名补全（U05、U06 / S07）              | Mustache 对象 key 漏收集路径源码确认             | P1           | 2–4    | core class AST 与映射、service links；中。类名和表达式变量必须分别导航。                        |
| T09    | 已注册全局组件的标签补全（U06）                               | 类型基础已有；全局来源与补全覆盖待测             | P1           | 2–4    | 应用配置 / 类型来源聚合、service；中。应用边界、同名覆盖与缓存。                                |
| T10    | props / expose / Hooks 变量补全与 hover（U06）                | 已有类型合并；复杂写法待复现                     | P1           | 2–3    | setup 解析、ctx 生成、TS completion；中。Ref 解包、泛型、导航和重复映射。                       |
| T11    | 内建标签属性、平台属性和事件补全（U06）                       | 已有元数据；具体漏项待复现                       | P2           | 2–4    | template data、内建类型、事件生成；中。平台误提示和补全 / 校验不一致。                          |
| T12    | 静态组件 JSON Schema 提示（U07 / S08）                        | 能力存在；实际缺项或激活问题待复现               | P1           | 1–2    | JSON Schema、文档匹配、SFC 嵌入；低。保留注释、尾逗号和已有页面提示。                           |
| T13    | 动态 `<script name="json">` 配置类型提示（U07）               | 专用插件未启用源码确认；具体体验待测             | P2           | 3–5    | JSON-JS 虚拟类型、service；中高。不能执行用户配置来获取类型。                                   |
| T14    | 自动闭合 / 标签联动重命名（U08）                              | 底层能力已接入；编辑器链路待复现                 | P1           | 1–3    | service capabilities、template mapping、客户端配置；中。半成品标签、自闭合标签与重复插入。      |
| T15    | props / expose / Hooks 同名警告（U09）                        | 未见专用静态冲突诊断；合并行为源码确认           | P1           | 3–5    | core 元数据、service diagnostics / related info；中高。键来源、spread、类型字段与运行时优先级。 |
| T16    | 实例暴露字段 `data` 的保留名警告（U09）                       | 框架有保留规则；编辑期诊断缺口为源码推断         | P1           | 1–2    | core 暴露 key 分析、service diagnostics；中。重点防止局部变量误报。                             |
| T17    | 与 Vue 插件共存时的 `defineProps` 误报（U10）                 | 已确认 Vue 2.7 全局宏冲突；PR #120 已合并        | P0           | 3–7    | 实际修改 language-core 全局 / 文件内宏类型；高。合并前验证及编辑器检查范围见第 3.2 节。         |
| T18    | 模板变量、标签内置属性与事件绑定补全（U06，更正汇总）         | 范围合并至 T10 / T11，不独立实施                 | 随 T10 / T11 | 不另计 | 变量来源见 T10；mpx / wx / rn 标签属性与事件绑定见 T11。                                        |

更正后 17 项独立粗估合计 **46–82 人日**（移除原 T18 的 1–2 人日，模板补全成本计入 T10 / T11），仅用于展示完整范围量级；任务间有共用基础，部分待复现项可能只需配置说明或已有修复验证，因此不应直接作为交付承诺。另预留首轮复现 / 设计 2–3 人日及最终集成验收 2–3 人日。T17 如果需要上游 Volar / TS 适配或全局 helper 全面迁移，应单独重估，不包含在 3–7 日局部修复假设里。

### 3.1 修复进度与并行安排（2026-10-30）

初轮核对：2026-11-03 15:43（Asia/Shanghai）；此后按单项证据逐行更新，最新交付见第 3.4 节。12 个剩余范围分别由独立会话推进，均已形成 PR；T14 回归 PR 已合并，其他 11 项仍在评审或集成阶段。T01 / T08 / T10 / T11 / T14 / T17 已有合并记录；T13 只完成通用 JS 语义合并，Schema 提示仍未交付。下表是核对时快照，PR 中不等于已合并、已完成 F5 视觉验收或已发布。

| 工作项                      | 当前状态                                 | Issue / 分支 / PR                                                                                                                                                                | 跟进会话                             | 下一步与验证记录                                                                                                                                                                                                                                                    |
| --------------------------- | ---------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| T01：样式指令高亮与补全     | 已合并；F5 视觉验收通过                  | [#127](https://github.com/mpx-ecology/language-tools/issues/127)；`codex/fix-t01-style-directives`；[PR #130](https://github.com/mpx-ecology/language-tools/pull/130)            | 已交付记录                           | 2026-11-02 合并；专项 101 项 / 全量 120 项。修复前后截图见 PR #130；待登记发布版本。                                                                                                                                                                                |
| T02：mpxTagName             | PR 中；F5 证据已上传并嵌入               | [#145](https://github.com/mpx-ecology/language-tools/issues/145)；`codex/fix-t02-mpx-tag-name`；[PR #166](https://github.com/mpx-ecology/language-tools/pull/166)                | T02：mpxTagName 标签语义与高亮       | 2026-11-03 16:42 核验交付；Issue 复现图与 PR 同场景前后图均已嵌入，0 → 2 个错误。拍摄配置 head 39d85ef 的 Test / autofix 通过；2026-11-03 21:39 主线集成 head 18ab7cc 的 Test / autofix、115 项专项、637 项全量及 build / lint / 扩展构建通过；未重拍，待评审批准。 |
| T03：RN 注册组件            | PR 中；有效基线图已拍，后图/上传待补     | [#151](https://github.com/mpx-ecology/language-tools/issues/151)；`codex/fix-rn-component-registration`；[PR #159](https://github.com/mpx-ecology/language-tools/pull/159)       | T03：RN 注册组件的类型与导航         | 36 项专项、492 项全量记录保留；有效基线图已保存，欢迎页遮挡图作废，修复后同视图与附件仍待补。                                                                                                                                                                       |
| T04：多平台解析             | PR 中；最新方案 F5 / 截图待补            | [#148](https://github.com/mpx-ecology/language-tools/issues/148)；`codex/fix-platform-component-paths`；[PR #167](https://github.com/mpx-ecology/language-tools/pull/167)        | T04：多平台组件解析与正向跳转        | 已移除活动平台配置，改为无需配置聚合实际文件候选；最新 72 项专项、609 项全量通过。旧方案宿主检查不计入本版本 UI 验收。                                                                                                                                              |
| T05：反向引用               | PR 中；宿主 API 通过，截图待补           | [#149](https://github.com/mpx-ecology/language-tools/issues/149)；`codex/fix-component-references`；[PR #163](https://github.com/mpx-ecology/language-tools/pull/163)            | T05：组件使用方与多平台反向引用      | 23 项专项、496 项全量通过；静态局部注册已覆盖，自动平台选择仍依赖 T04。                                                                                                                                                                                             |
| T06：自动注册               | PR 中；宿主交互通过，截图待补            | [#146](https://github.com/mpx-ecology/language-tools/issues/146)；`codex/fix-template-component-registration`；[PR #165](https://github.com/mpx-ecology/language-tools/pull/165) | T06：模板补全后自动注册组件          | 60 项专项、533 项全量通过；JSON / JS / 无区块接受与一次撤销通过；RN 注册另依赖 T03。                                                                                                                                                                                |
| T07：refs 类型              | PR 中；宿主 provider 通过，截图待补      | [#155](https://github.com/mpx-ecology/language-tools/issues/155)；`codex/fix-typed-template-refs`；[PR #162](https://github.com/mpx-ecology/language-tools/pull/162)             | T07：useContext refs 精确实例类型    | 场景修正及真实编译回归已提交；23 项专项、496 项全量通过。F5 及上传排队；RN 实例和平台选择边界衔接 T03 / T04。                                                                                                                                                       |
| T08：动态 class             | 已合并；Extension Host 检查通过          | [#126](https://github.com/mpx-ecology/language-tools/issues/126)；`codex/fix-t08-dynamic-class-links`；[PR #129](https://github.com/mpx-ecology/language-tools/pull/129)         | 已交付记录                           | 2026-11-02 合并；专项 31 项 / 全量 65 项。待登记发布版本。                                                                                                                                                                                                          |
| T09：全局组件补全           | PR 中；宿主 provider 通过，截图待补      | [#150](https://github.com/mpx-ecology/language-tools/issues/150)；`codex/fix-registered-global-components`；[PR #164](https://github.com/mpx-ecology/language-tools/pull/164)    | T09：已注册全局组件的标签补全        | 23 项专项、525 项全量通过；应用 / 类型扩展候选、局部覆盖与刷新通过；跨应用动态入口保留边界。                                                                                                                                                                        |
| T10：模板变量补全与类型     | 已合并；F5 验收通过                      | [#140](https://github.com/mpx-ecology/language-tools/issues/140)；`codex/fix-t10-t11-template-completion`；[PR #143](https://github.com/mpx-ecology/language-tools/pull/143)     | 查找尚未跟进的反馈问题               | 2026-11-03 合并；与 T11 共用专项 129 项 / 全量 421 项记录，覆盖作用域和 any Hooks 局部补全兜底。                                                                                                                                                                    |
| T11：标签内置属性与事件绑定 | 已合并；F5 验收通过                      | [#141](https://github.com/mpx-ecology/language-tools/issues/141)；`codex/fix-t10-t11-template-completion`；[PR #143](https://github.com/mpx-ecology/language-tools/pull/143)     | 查找尚未跟进的反馈问题               | 与 T10 同 PR；补内置属性、事件形式及条件属性编辑。直接注册 RN 组件的类型接入归 T03。                                                                                                                                                                                |
| T12：静态 JSON              | PR 中；宿主 API 通过，截图待补           | [#153](https://github.com/mpx-ecology/language-tools/issues/153)；`codex/fix-static-json-schema`；[PR #157](https://github.com/mpx-ecology/language-tools/pull/157)              | T12：静态组件 JSON Schema 提示       | 补充提交 9679af1：22 项专项、495 项全量通过；新增 npm 路径、泛型扩展、页面枚举与应用配置兼容性回归，截图排队。                                                                                                                                                      |
| T13：动态 JSON 配置         | JS 语义已合并；Schema 草稿以 main 为基线 | [#154](https://github.com/mpx-ecology/language-tools/issues/154)；`codex/fix-t13-json-config-types`；[PR #160](https://github.com/mpx-ecology/language-tools/pull/160)           | T13：动态 JSON 配置的类型提示        | 通用 JS：#138 → #142 已合并。#160 已同步 main 并改 base；624 项全量通过，最新 Test / autofix 均通过，仍为 Draft；真实 F5 及截图待补。                                                                                                                               |
| T14：标签闭合与重命名       | 未复现运行时缺陷；回归 PR 已合并         | 不适用（未确认缺陷）；`codex/test-t14-tag-editing`；[PR #156](https://github.com/mpx-ecology/language-tools/pull/156)                                                            | T14：自动闭合与标签联动重命名        | 2026-11-03 合并；29 项专项、502 项全量及真实宿主输入 / provider 通过。仅测试与验收，无修复前后差异；原用户环境仍需按配置复现。                                                                                                                                      |
| T15：实例字段重名           | PR 中；有效前后图已拍，上传待补          | [#147](https://github.com/mpx-ecology/language-tools/issues/147)；`codex/fix-instance-field-collisions`；[PR #158](https://github.com/mpx-ecology/language-tools/pull/158)       | T15：props expose Hooks 字段重名警告 | 已增加性能 / 增量回归并推送 0534404；先前本地全量 499 项及独立性能基准通过；集成问题已修复，最新 Test / autofix 均通过。F5 及附件仍待补，不把性能表当截图。                                                                                                         |
| T16：实例保留名 data        | PR 中；保留名与诊断码迁移分开验收        | [#152](https://github.com/mpx-ecology/language-tools/issues/152)；`codex/fix-t16-reserved-instance-data`；[PR #161](https://github.com/mpx-ecology/language-tools/pull/161)      | T16：实例暴露 data 保留名警告        | 本项 #161 保留 85 项专项、558 项全量记录。#168 → #169 为独立诊断码草稿，31 项专项、615 项全量通过；两组 F5 截图均待补。                                                                                                                                             |
| T17：Vue 宏共存             | 已合并；Extension Host 检查通过          | [#119](https://github.com/mpx-ecology/language-tools/issues/119)；`codex/fix-119-vue-macro-coexistence`；[PR #120](https://github.com/mpx-ecology/language-tools/pull/120)       | 已交付记录                           | 2026-11-02 合并；最终 165 项测试、20 项真实编译交叉检查通过。待登记发布版本。                                                                                                                                                                                       |
| T18：模板补全（更正汇总）   | 范围合并至 T10 / T11                     | 同 T10 / T11；[PR #143](https://github.com/mpx-ecology/language-tools/pull/143)                                                                                                  | 不另开会话                           | 原 CSS 补全反馈已更正，不独立排期、实现或计费。                                                                                                                                                                                                                     |

表中 build / test / lint 数字来自各 PR 已记录的独立提交基线，不能相加或当作当前 main 测试总数，也不代表后续新提交或当前 CI 一定通过。T15 此前的 CI 集成问题已修复，最新 Test / autofix 通过；与截图交付分开记录。真实 Extension Host API / provider 检查与人工视觉、截图证据分别记录；未捕获截图的条目没有因此被标记为已完成视觉验收。

并行集成与截图要求：

- 2026-11-03 补充桌面协调：代码与无焦点副作用的后台测试继续并行；F5 GUI 启动 / 重载、切换窗口、输入、系统截图和截图附件上传（含后台浏览器上传）通过同一主机共享的协作互斥锁串行执行；单次上传持锁至获得有效附件 URL。独立 worktree / profile 不隔离桌面焦点。各会话使用专用场景副本、数据目录与端口，只管理自己启动的进程；浏览器后台操作只用自己创建的标签页。同一 Issue / PR 写入前重读并合并最新内容，总表仍由本会话集中更新。
- 每个会话保留自己的工作目录与分支，按实际组件身份、平台解析和公开类型接口衔接；T05 / T06 / T07 的多平台增强依赖 T04，RN 扩展依赖 T03，自动注册全局去重衔接 T09。
- T13 的 #142 已合并；#160 已同步 main 并更改 base，仍为 Draft，最新 Test / autofix 已通过，待完成真实 UI 与截图后再转 ready，不能因依赖已合并直接登记完成。
- 2026-11-03 起，Issue 默认附最小 `inspect-extension` 场景的真实问题复现截图；修复 PR 默认附同场景、设置、主题及可比较视图的 F5 修复前后截图。图片上传 GitHub 附件，不提交到仓库，不公开原始内部截图。
- 只有无法或无需通过 F5 验证的变更可以省略，需在 Issue 的 `复现截图` 和 PR 的 `效果对比` 写清原因及替代证据。代码 / 测试充分本身不构成豁免；待补截图保持待补。T14 无运行时修复，修复前后对比不适用；本次纯文档 / 规范更新也无需 F5 截图。
- 截图补充要求已同步本轮修复会话；共享总表由 PR #131 集中维护，避免并行改写。后续合并、视觉验收及发布按实际证据分别补记。

### 3.2 T01 / T08 / T17 交付与验证（2026-11-02）

三项均于 2026-11-02 合并。下表采用各 PR 合并前的最终验证记录；不同 PR 的测试基线与范围不同，不能相加，也不代表当前主分支的全量测试数。

| 工作项 | 实现与回归                                                                                                                                                                             | 合并前最终验证                                                                                                                         | 真实 Extension Host 检查                                                                                                                                        |
| ------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| T01    | 独立指令注释内 / 前缀补全，保留注释、条件与光标位置；附加补全避免被 CSS 主列表遮蔽。指令条件按 JavaScript 高亮，保护注释边界、字符串与 MARK；PostCSS 缺少外部 grammar 时回退内置 CSS。 | 专项 4 文件 / 101 项（含 MARK）、全量 120 项及 build / lint 通过；五种手动样式块经真实 Mpx parser 与条件编译器按 wx / ali / web 验证。 | 实际补全 provider 通过；2026-11-02 在 Code Insiders 1.145.0 / Dark Modern 复验 CSS / SCSS / Less / PostCSS / Stylus 的指令与条件高亮、注释边界、字符串及 MARK。 |
| T08    | 收集可确定的 Mustache 类名，精确调整类名片段导航，保留变量导航及 verification / completion / semantic 映射；覆盖诊断、hover、补全与导航回归。                                          | 专项 31 项、全量 65 项及 build / lint 通过。                                                                                           | VS Code 1.144 中，静态类名、对象 key 和数组类名各只有一个样式定义；条件变量脚本定义、hover 与本地类名补全通过。                                                 |
| T17    | 隔离 Vue 全局宏与 Mpx 文件内宏类型；保留显式绑定、词法补全、跳转和重命名行为。替换不符合 Mpx 语义的用例，增加真实编译及产物执行验证。                                                  | 最终 165 项测试及 build / lint 通过；其中 20 项真实编译检查经锁定发布包与相邻 Mpx 源码交叉验证。                                       | PR #120 最终记录 Extension Host 检查通过；场景与检查步骤见下方固定版本链接。                                                                                    |

T01 的 2026-10-30 初轮记录为专项 68 项、全量 102 项，当时仅验收指令关键字。2026-11-02 新增条件表达式高亮后，以表中的 101 / 120 项及复验结果为准，原“条件保持注释色”的标准已被替代。

验证范围与证据：

- **T01：** 补全仅作用于独立指令注释；同行样式语句后的注释及条件变量补全不在范围内。条件变量使用 `variable.other.readwrite.js`，位于 `meta.embedded.block.mpx-style-condition` 内；Dark Modern 下变量为蓝色（`#9CDCFE`），字符串、布尔值、数字和运算符按 JavaScript 主题配色。多行、嵌套及不完整条件不能吞掉后续样式，普通字符串、注释与 MARK 保持原有行为。[手动场景与验收记录](https://github.com/mpx-ecology/language-tools/blob/fcd84261f83b48a433463cc96188b457af61e9d0/inspect-extension/components/style-directives/README.md)；修复前后实际窗口截图位于 [PR #130 描述](https://github.com/mpx-ecology/language-tools/pull/130)，作为 GitHub 附件保存，未纳入 Git。
- **T08：** 按真实 Mpx 语义区分普通 `class` 与完整单段 `wx:class`；对象 / 数组归一化仅用于后者，不猜测运行时名称、转义字面量或拼接片段。已有诊断、普通变量及 shorthand 的真实导航语义保留。[手动场景与检查步骤](https://github.com/mpx-ecology/language-tools/blob/76ec3ef3ce1b06b98800be30fb094f340a233157/inspect-extension/components/dynamic-class-links/README.md)。
- **T17：** 验证保留运行时 props、类型式 props 默认值、显式类型导入、真实绑定的 helper 别名、提升绑定及 Vue 控制文件。Extension Host 检查通过不代表已覆盖所有插件版本、SDK 和启用组合；后续异常按实际环境复现。[最终手动场景与检查步骤](https://github.com/mpx-ecology/language-tools/blob/e36dc06a42cb51d562cbb823f5069e9034f3474c/inspect-extension/components/vue-coexistence/README.md)。[初轮排查记录](../feedback/2026-10-30-vue-macro-coexistence.md)中的旧用例、测试数和“待合并 / 待 F5”是历史快照，最终交付以 PR #120 为准。

三项均有独立自动化 fixtures 与带预期行为注释的手动场景；自动化测试不依赖可变的 `inspect-extension` 工作区。合并结果、编辑器检查与发布版本分别记录，不能据此推定已随版本发布。

### 3.3 F5 截图与上传快照（2026-11-03）

本节保留初轮历史快照，后续单项交付以[逐项证据交付记录](#34-逐项证据交付记录)为准；不把初轮“待补”覆盖为当时已经完成。

核对时间：2026-11-03 15:43（Asia/Shanghai）。用户已亲自为 Code - Insiders 选择 Always allow，继续推进指令已送达 12 个相关会话；核对时未再观察到这 12 个会话的旧审批等待标记。当前桌面锁由 T03 持有，其他会话继续锁外工作。F5 操作、截图及所有截图附件上传使用同一把锁串行执行；应用授权不代替互斥，也不代表其他应用或系统权限已获批。

“本地有效图”“附件已上传”“图片已嵌入 Issue / PR”分别登记。下表依据各负责会话和 GitHub 正文核对，不把准备好环境、provider 通过或草稿图片计为截图交付。

| 范围                     | Issue → PR                                                            | 本地 F5 证据 / 当前阶段                                                   | GitHub 图片交付                                                  |
| ------------------------ | --------------------------------------------------------------------- | ------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| T02 mpxTagName           | #145 → [#166](https://github.com/mpx-ecology/language-tools/pull/166) | 有效 before/after 已持锁拍摄并核验；错误数 0 → 2，标签值高亮恢复          | 两图仍在本地，上传与正文嵌图待补                                 |
| T03 RN 组件              | #151 → [#159](https://github.com/mpx-ecology/language-tools/pull/159) | 正在持锁验收；被欢迎页遮挡的图作废重拍                                    | 待有效对比图与附件                                               |
| T04 多平台解析           | #148 → [#167](https://github.com/mpx-ecology/language-tools/pull/167) | 无配置方案已重验自动化，F5 排队；旧活动平台方案的 UI 记录不作为本版本验收 | 待补                                                             |
| T05 反向引用             | #149 → [#163](https://github.com/mpx-ecology/language-tools/pull/163) | 基线已构建，两个相同视图已准备，等待 UI 时段                              | 待补                                                             |
| T06 自动注册             | #146 → [#165](https://github.com/mpx-ecology/language-tools/pull/165) | 基线和候选 / 注册后场景已准备，等待 UI 时段                               | Issue / PR 已标待补，尚无附件                                    |
| T07 refs                 | #155 → [#162](https://github.com/mpx-ecology/language-tools/pull/162) | 已修正合法场景并补真实编译回归，等待持锁采集                              | 待补                                                             |
| T09 全局组件             | #150 → [#164](https://github.com/mpx-ecology/language-tools/pull/164) | 同场景与主题已准备，继续锁外回归与正文整理                                | 待补                                                             |
| T12 静态 JSON            | #153 → [#157](https://github.com/mpx-ecology/language-tools/pull/157) | 兼容性补充提交与验证已更新，等待持锁采集                                  | 待补                                                             |
| T13 配置 Schema          | #154 → [#160](https://github.com/mpx-ecology/language-tools/pull/160) | 已同步 main，624 项全量通过；仍为 Draft，等待真实 UI                      | 待补                                                             |
| T15 字段重名             | #147 → [#158](https://github.com/mpx-ecology/language-tools/pull/158) | 性能 / 增量回归和 CI 集成修复已完成；截图仍需可靠选中专用窗口后持锁重验   | 待补；性能对比不能代替 F5 图                                     |
| T16 保留名               | #152 → [#161](https://github.com/mpx-ecology/language-tools/pull/161) | 独立基线及修复宿主已准备，等待 UI 时段                                    | 待补                                                             |
| JSON JS 历史证据         | #138 → [#142](https://github.com/mpx-ecology/language-tools/pull/142) | PR 已合并；同场景前后环境已准备，仅补历史证据                             | PR 原有 4 张修复后图保留；Issue 复现图及成对 before/after 仍待补 |
| 诊断码统一（独立后续项） | #168 → [#169](https://github.com/mpx-ecology/language-tools/pull/169) | 草稿 PR；31 项专项、615 项全量通过，三套环境已准备                        | 待补；与 #161 分开登记，不新增 T19 或重复计入原 17 项            |

后续核对（2026-11-03 15:49，Asia/Shanghai）：T15 此前的 [GitHub Test 失败](https://github.com/mpx-ecology/language-tools/actions/runs/41597191371/job/125787192453) 已修复，最新 [Test](https://github.com/mpx-ecology/language-tools/actions/runs/41598197558/job/125790436021) / [autofix](https://github.com/mpx-ecology/language-tools/actions/runs/41598193189/job/125790423099) 均成功；T13 的 [Test](https://github.com/mpx-ecology/language-tools/actions/runs/41597537394/job/125788291856) / [autofix](https://github.com/mpx-ecology/language-tools/actions/runs/41597534285/job/125788282746) 也已成功。两项仍需 F5 图片交付。

本批次持续跟进：每项满足交付条件即同步 PR #131，保留完成链接和验证版本。执行协调每 2 分钟检查，只有确需用户亲自操作时即时提醒；按用户后续要求，另每 5 分钟汇报并自动推进各会话，直到全部关联 PR 达到可合并状态；不自动合并。同一未变化阻塞不重复催问。

后续只有取得真实附件 URL 并确认嵌入对应正文，才改为“已上传并嵌入”；被其他窗口抢焦点、受限模式或欢迎浮层遮挡的图片不作为交付证据。截图排队是待办状态，不能作为免截图理由。

### 3.4 逐项证据交付记录

每条记录代表本项修复与所需证据已提交评审，不代表 PR 已合并或随版本发布。完成一项即单独同步，不等待其余项目。原始截图不纳入 Git。

| 范围            | 核验时间（Asia/Shanghai） | Issue / PR                                                                                                                        | 验证版本                                                                                                                                     | 公开附件                                                                                                                                                                                    | 交付与剩余状态                                                                                                                                                                                                                                                                                                                                                 |
| --------------- | ------------------------- | --------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| T02：mpxTagName | 2026-11-03 16:42          | [#145](https://github.com/mpx-ecology/language-tools/issues/145) → [#166](https://github.com/mpx-ecology/language-tools/pull/166) | before 60ebb13；修复 3fd141c；拍摄配置 head 39d85ef53c75acc23cfe59f5f45e2cb290443d6b；主线集成 head 18ab7cc2142c144038c1eb9e764018d42f0b2b86 | [复现 / 修复前](https://github.com/user-attachments/assets/d7919e93-5a47-447b-bf8f-9e42218341a3)、[修复后](https://github.com/user-attachments/assets/d8dfe805-6f03-48c9-9ea5-4fff4e40e08c) | Issue 正文已嵌入复现图，PR 正文已嵌入同场景前后图；0 → 2 个属性错误及标签值高亮变化可见。上传内容与本地已核准原图字节一致，GET 返回 image/png；原拍摄配置及主线集成 head 的 Test / autofix 均成功；2026-11-03 21:39 核验集成后 115 项专项、637 项全量及 build / lint / 扩展构建通过。截图未重拍，不将历史 F5 证据写作新 head 的再次视觉验收。PR 仍待评审批准。 |

同一场景文件逐字节一致，主题、字号与检查位置保持可比较；两图均为真实 Extension Development Host 窗口，不包含内部业务信息。HEAD 请求曾返回 403，但两附件的实际 GET 均为 200；没有把 HEAD 失败误判为图片未交付，也没有用测试日志替代截图。

### 3.5 集成核验与待交付记录

此表记录主线集成后的验证和剩余交付，不计作第 3.4 节的完整证据交付。截图保留真实 capture heads；集成检查通过不能代替新 head 的 F5 验收，也不解除仓库评审规则。前文各行及第 3.3 节保留既有核对记录，本表补充后续进展。

| 范围                                                                                                                                             | 核验时间（Asia/Shanghai） | 集成 head 与检查                                                                                                                                                                              | 截图及附件                                                                                                                                                   | 剩余待办                                                                                        |
| ------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------- |
| T12 静态 JSON；[#153](https://github.com/mpx-ecology/language-tools/issues/153) → [#157](https://github.com/mpx-ecology/language-tools/pull/157) | 2026-11-03 21:44          | `45f4dec031dd0c3f8db302c0452824d92b96e763` 已合入 main `e40ca6a`；104 项专项、606 项全量、build / lint / 扩展打包通过，当前 head 的 Test / autofix 成功；无合并冲突、无未解决 review thread。 | 同场景静态 JSON 诊断 4 → 8 的前后原图本地已齐、已核准；capture heads `ff1d26d` / `9679af1` 保留，尚无新附件 URL；新 head 未执行 GUI/F5，仅记录代码集成验证。 | 协调自动上传后补 Issue 复现图及 PR 前后图，再同步完整交付；仍需至少一名评审批准，不标记已完成。 |
| T03 RN 类型；[#159](https://github.com/mpx-ecology/language-tools/pull/159)                                                                      | 2026-11-03 21:48          | `c1d1ec4e97c0e0d6abd28d1074f21d0b6603fc66` 已合入 main `e40ca6a`；118 项专项、603 项全量及 build / lint 通过，当前 head 的 Test / autofix 成功，无合并冲突、无未解决 review thread。          | capture heads：ff1d26d / 4399a95；前后原图本地已齐并核准，待自动上传；新 head 未执行 F5。                                                                    | 证据未完整交付，仍需自动附件上传/正文嵌入及至少一名评审批准，不标记完成。                       |
| T05 组件反向引用；[#163](https://github.com/mpx-ecology/language-tools/pull/163)                                                                 | 2026-11-03 21:48          | `852bce45165b7b5e9a23dd6c38bb00df2e6caead` 已合入 main `e40ca6a`；87 项专项、610 项全量及 build / lint 通过，当前 head 的 Test / autofix 成功，无合并冲突、无未解决 review thread。           | capture heads：历史图及 manifest 保留原归属；组合回归新增 JSON-only Program 隔离修复；待同场景截图及附件，新 head 未执行 F5。                                | 证据未完整交付，仍需自动附件上传/正文嵌入及至少一名评审批准，不标记完成。                       |
| T07 refs 实例类型；[#162](https://github.com/mpx-ecology/language-tools/pull/162)                                                                | 2026-11-03 21:48          | `8f5cf8b9c463b4f6793b85590c847b3fff8706c4` 已合入 main `e40ca6a`；134 项专项、607 项全量及 build / lint 通过，当前 head 的 Test / autofix 成功，无合并冲突、无未解决 review thread。          | capture heads：ff1d26d / b77bbb8；前后原图本地已齐并核准，待自动上传；新 head 未执行 F5。                                                                    | 证据未完整交付，仍需自动附件上传/正文嵌入及至少一名评审批准，不标记完成。                       |
| T16 保留名诊断；[#161](https://github.com/mpx-ecology/language-tools/pull/161)                                                                   | 2026-11-03 21:48          | `48b7214550a1bc7a71a2fd71bdec44dc2ec6c980` 已合入 main `e40ca6a`；155 项专项、669 项全量及 build / lint 通过，当前 head 的 Test / autofix 成功，无合并冲突、无未解决 review thread。          | capture heads：历史证据保留原归属；待同场景截图及附件；新 head 未执行 F5；#168 / #169 保持独立，未改动。                                                     | 证据未完整交付，仍需自动附件上传/正文嵌入及至少一名评审批准，不标记完成。                       |

## 4. 分组分析与修复边界

### 4.1 样式高亮与标签编辑：T01、T14

样式指令补全已存在，但“新行输入 `@` 自动包成注释”与“在 `/* @` 中继续输入”是两个交互。补齐注释内指令名、前缀过滤与光标位置，不重复生成 `/* */`。`__ISRN__` 先作为用户项目条件变量保留，不假设它是框架固定内建宏；第一期可只补指令，条件变量来源另核对。

高亮需分别检查 TextMate token、TS semantic token 和客户端插值装饰，不承诺固定颜色；标准主题应能区分标签、属性、注释和表达式。CSS / Less / SCSS / PostCSS / Stylus 分开验证，对尚未复现的预处理器能力不作统一支持承诺。

自动闭合检查 `>`、`/` 触发及 `html.autoClosingTags`；联动重命名检查 `editor.linkedEditing` 和 linked editing ranges。普通同步修改开闭标签与 F2 重命名组件符号分别验收，不能混作同一功能。应覆盖自定义标签、嵌套、连字符、半成品模板和自闭合，允许关闭配置后停止自动操作。

### 4.2 组件身份、平台与 RN：T02、T03、T04

先定义可复用的组件元信息：源码标签范围、实际组件名、注册来源、类型来源、候选文件及平台条件。应尽量扩展现有 JSON resolver 与虚拟 TS import，不预设必须新建全仓库索引。

- `mpxTagName` 的静态值需要按实际标签参与补全、props、诊断、定义和语义 token，同时映射回属性值范围。`mpxTagName@ios|android` 需与平台属性归一化一起处理；保留原始开闭标签范围，联动编辑不得改错对象。动态值若框架允许，第一期仅支持可静态确定的候选。
- RN 组件先覆盖 S03：`NativeView: View` 的注册别名，`onLayout` 参数 `LayoutChangeEvent` 和定义跳转。既考虑 `defineOptions({ components })`，也考虑 options API；props 从 React 组件类型提取，事件作为 `onXxx` prop 处理，不能统一改写成小程序 `bind / catch`。
- React 函数组件、类组件、forwardRef / memo 等形态应在 fixture 中分开，避免沿用仅能 `new` 的组件假设。依赖声明本身不可解析时，先呈现可理解的边界，不用宽泛 `any` 掩盖全部组件类型。
- 平台解析先对齐 Mpx 编译器的候选顺序、fallback、显式后缀和 `mode / env` query 语义。确定项目是否已有可靠的平台来源，再决定是否增加编辑器侧活动平台配置；不能默认硬编码 ios。
- 无确定平台时可展示带来源的平台候选；有确定平台时按规则选择有效定义。按规范化实际 URI 与 range 去重，不能把合理的 ios / 默认双候选都删成一项。
- 组件 import、模板定义、JSON 路径跳转和候选类型使用同一解析结果；增加、删除或重命名平台文件后缓存必须失效。

验收以 RN props 正确检查、错误参数诊断、hover、别名跳转及平台 fallback 为一组，不能只验“F12 能打开文件”。

### 4.3 refs 与变量类型：T07、T10

refs 应从 Mpx 模板声明采集名字、目标组件、循环和条件信息，再连接子组件公开实例类型。`defineExpose`、options methods / setup 返回值和 RN ref 的公开面分别核对框架行为，不能直接套用 Vue 模板 ref 规则。

`useContext()` 的 Context 在框架类型中是通用类型，精确到每个 SFC 需要文件局部的类型衔接或虚拟代码变换。保留 triggerEvent 等其他 Context 能力，不通过全局覆盖所有文件的 Context 达成推断。截图内部别名可改善可读性，但验收主体是 `loadMoreMerchants` 的签名、参数、返回值、补全与定义。

覆盖 `const { refs } = useContext()`、别名解构、`context.refs`；普通 ref、循环 ref、条件缺省、异步 ref 按框架真实语义建立单值 / 数组 / 可空 / Promise 模型。存在无法静态确定的动态名字时采用明确的保守类型，不能编造不存在的方法。

模板变量补全从现有 `__MPX_ctx` 入手，覆盖运行时 props、泛型 props、解构、`defineExpose` 的 Ref、Hooks 返回对象及选项式组件。区分模板中自动解包与脚本中的 `.value`；新增类型不得产生重复诊断或让已有源定义丢失。多次 Hooks 注册需先核实是否允许，再决定合并而非只保留最后一次。

### 4.4 class 与内建属性：T08、T11

T08 第一阶段只解析可静态确定的类名：静态 class、Mustache 对象 key、字符串、数组及条件表达式中明确的字符串；复用 class 结果同时供点击跳转和补全使用。S07 的 `'is-solo'` 跳到 style，`titleText` 仍跳到脚本。对运行时拼接、变量计算出的类名不承诺完整求值或猜测跳转。

需考虑同文件多个 style、scoped 配置、Unicode 和转义后的源码 offset；预处理器嵌套选择器单独验证。导入样式或跨文件样式补全是否纳入首期需先明确，不能隐含在这份 2–4 日估算中。

T11 检查 HTML 补全数据和 TS 内建类型的来源一致性。平台独占 props、事件参数、`bindtap / bind:tap / catch / capture-*` 和带 `@平台` 属性要有边界；RN 原生组件的 `onLayout` 归 T03，Mpx RN 内建标签的属性与事件归 T11。第一期修复具体漏项，长期再评估从统一元数据生成，避免一次重建全部数据源。

### 4.5 全局组件、自动导入与引用：T05、T06、T09

先把“全局组件”拆清楚：应用已注册组件、`GlobalComponents` 类型扩展、当前文件已注册组件和工作区可导入组件。前三类用于已有符号补全；最后一类才需要自动注册。局部覆盖、标签大小写、包组件、别名、分包应用边界都要保留来源信息。

T06 第一版建议支持静态 JSON 和可安全编辑的字面量 JS 注册对象，在用户接受补全或明确应用 Quick Fix 时通过一个 WorkspaceEdit 写入注册；已有 `usingComponents` 则合并，无区块则创建有效区块。已全局注册的组件无需再局部注册，重复接受操作应幂等，支持一次撤销，保留注释和路径风格。RN 注册表应写入 `components` 并补脚本 import，不应错写进 `usingComponents`；此 RN 扩展依赖 T03，首期可独立延后。

动态 JS 配置、条件注册或 `Object.assign` 中不能可靠定位编辑点时，给出具体可审查的候选或操作提示，禁止执行配置文件或静默覆盖对象。工作区候选发现按项目缓存、监听文件变更，不在每次输入时全盘扫描。

T05 先测试已有 TS 导航映射能否完成“模板 → 组件”“组件 → 所有模板使用方”“注册路径 → 组件”。缺失部分再补符号关联或最小索引。反向查找按实际组件身份关联，覆盖大小写 / 连字符别名、相对路径 / paths / npm、平台候选及开闭标签去重；不要靠全文匹配同名标签，动态不可解析引用明确不计为已支持。

### 4.6 JSON 配置：T12、T13

T12 先复现 S08 同款 `<script type="application/json">`，核对 `component` 的 hover / 布尔值补全、错误类型诊断、`usingComponents` 路径补全和跳转。目前 Schema 已含这些顶层字段，不能以“新增 component schema”作为完成标准。继续检查项目实际需要的组件字段、嵌套对象和值类型；`usingComponents` 当前只有 object 约束，可按真实配置语义补值约束。

T13 单独处理 `<script name="json">` 的 JS 配置。通过虚拟类型约束连接配置对象与结构提示，覆盖安全的字面量、导出形式及条件分支，并保留 TS 路径补全。应用 / 页面 / 组件与平台 schema 的分层需要可靠上下文；无法识别文件角色时不得把合法配置误报成非法字段。

### 4.7 实例重名与保留名：T15、T16

当前 setup 上下文按对象展开合并，不会自然给出所需的跨来源冲突警告。应建立暴露字段来源表，对 props、expose、Hooks 返回值的同名 key 发出 warning，即使两个来源类型相同也不忽略；诊断定位实际 key，并通过 related information 指向另一处声明。条件编译互斥的字段应先判断有效平台，避免将互斥分支误判为同一实例冲突。

只对可确定的实例公开字段诊断；别名后的公开名字才是比较对象。对象 spread、间接类型和动态返回值逐步覆盖，无法确定时不猜测。保留运行时实际覆盖 / 合并优先级，静态警告不能悄悄改掉推断含义，也不应给类型冲突再重复发一组相同诊断。

T16 首期满足用户要求的 `data`，仅在暴露为实例字段时警告。普通 `const data = ref(...)`、`{ data: renamed }` 的局部别名，以及未挂载实例的模块导出不应一律报警；通过 `defineExpose({ data })` 等实际暴露时才检查。相邻框架默认保留列表还含 `id / dataset`，是否同步扩展需与目标版本确认，不能据此扩大本轮要求。

### 4.8 Vue 共存：T17

按以下顺序把症状和根因分离：

1. 同一最小用例分别运行仅 Mpx、仅 Vue、共同启用；同时保留 `.mpx`、`.vue`、普通 `.ts` 文件，记录双方插件和 TS SDK 版本。
2. 覆盖运行时 `defineProps({ ... })`、泛型、`withDefaults`、解构、导入类型；记录错误 code、触发范围及项目归属，检查是否单插件已报错。
3. 对照项目同时存在 / 不存在 Vue 依赖、同一 TS project / 分离 project、不同插件加载顺序。比较全局宏声明、`__VLS_*` helper 与生成类型，排查 host 重复装饰及客户端字符串补丁是否生效。
4. 根据证据选择最小修复：文件局部宏绑定、Mpx helper 命名隔离、语言过滤或补丁兼容处理。任何全局 helper 迁移都单独评估，不直接全仓搜索替换；不要求用户永久禁用 Vue，也不用 `skipLibCheck` 作为修复完成标准。
5. 若只剩部分宏写法与 Mpx 编译器支持范围不一致，转为单独功能缺陷，调整 P0。若确认为上游依赖问题，记录最小复现和依赖版本范围后重新估算。

## 5. 分阶段实施与依赖

| 阶段                              | 工作内容                                                                                                        | 完成出口                                                                                                       |
| --------------------------------- | --------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| A：复现与口径，2–3 人日           | 建立 U10 最小共存环境；补齐 S03 / S06 / S07 的独立样例；核对 S05 必传属性与 S08 JSON 失效点；明确平台选择来源。 | 每个待修项具备版本、输入、实际 / 期望行为和可重复步骤。T17 若证实阻断立即进入修复，局部修复预算为表中 3–7 日。 |
| B：独立体验修复，6–13 人日粗估    | T01、T08、T12、T14、T16；只做已证实的覆盖与接线问题。                                                           | 样式指令、动态类名、JSON、标签编辑、保留字段有对应回归用例和 F5 验收。无需等待整套组件系统才能交付。           |
| C：组件与类型基础，23–38 人日粗估 | T02、T03、T04、T07、T09、T10、T15；先定组件元信息与平台解析，再接 RN / refs / 变量和冲突诊断。                  | 组件标签、props、事件、实例公开面、平台定义使用一致来源；诊断 / hover / 导航分别通过。                         |
| D：跨文件增强，14–24 人日粗估     | T05、T06、T11、T13；在稳定解析上补反向引用、自动注册、平台属性与动态配置。                                      | 查找结果完整且去重；注册编辑可撤销、幂等；大项目响应速度无明显退化。                                           |

阶段 B 中修改范围独立的小修可以与阶段 C 的复现 / 设计并行推进，具体安排见第 3.1 节；涉及共享组件与类型接口的实现先对齐设计。以上仍为人日粗估，并行安排不直接换算成确定交付日期。T17 修复和 A 的复现预算不包含在 B–D 合计中。

关键依赖：T04 → T05 / T06 / T07 的多平台行为；T03 → RN props / refs 与 RN 自动注册；T09 → T06 的全局去重；T10 / T07 的类型来源分析可供 T15 复用。T17 已合并，后续类型改动基于其文件内宏绑定方案回归，避免重复返工。

## 6. 回归与验收计划

### 自动化与手动场景

| 能力组                     | 建议自动化归属 / 核心断言                                                                                                           | 手动 F5 重点                                                                                |
| -------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| RN、平台组件、`mpxTagName` | `language-core/__tests__` 独立 fixtures；生成类型、props 诊断、hover、实际定义 URI / range、各能力映射；必要时 TS plugin 请求测试。 | 普通 / 注册别名 / 平台标签的语义 token、补全、F12 和候选展示。                              |
| refs、模板变量、冲突       | `language-core/__tests__` 验证实例签名、参数错误、返回值、来源定义；service 验证 warning 范围和 related info；普通 `data` 作负例。  | hover 不泄漏无用内部细节；方法补全、定义、条件 / 循环 ref。                                 |
| class、CSS、JSON、标签编辑 | core 断言 AST 收集与 offset；`language-service/__tests__` 验证具体 provider 结果、completion edit、linked ranges、配置开关。        | 动态类名 Cmd/Ctrl 点击，CSS / 预处理器补全，JSON hover、自动闭合和同步改名。                |
| 全局补全、注册、引用       | service / TS plugin 验证候选来源、WorkspaceEdit、重复操作、文件创建 / 删除后的失效、不同 URI 表示的去重。                           | 接受补全后可运行的配置、一次撤销、从子组件查全部使用方。                                    |
| Vue 共存                   | 增加最小双类型环境 / helper 冲突回归；必要时增加 TS plugin 组合加载的独立测试入口。                                                 | 两插件分别 / 同时启用，工作区 / 内置 TS SDK，`.mpx / .vue / .ts` 均验证合法例与故意错误例。 |

对应 `inspect-extension` 按功能放置自包含手动场景，现有 `components/rn`、`components/script-json` 可复用其目录习惯；refs、动态 class、共存场景可新增匹配目录。自动化 fixture 不依赖这个可变工作区，手动样例的故意错误需注释预期结果。只有新增的可独立失败行为才加测试，避免只复述实现。

每项至少验收一个成功例和一个边界 / 不应生效例。虚拟代码改动分别检查 `verification / completion / semantic / navigation`：不能为了去重全部关闭其中一类；必须保留原始 options 元数据、已知字段类型和源定义。

language-core 实施改动后按仓库要求运行对应 focused spec → `pnpm build` → `pnpm test` → `pnpm lint`。服务端改动待 watch 完成后在 Extension Host 执行 `Mpx: Restart Server`；客户端激活或 bundle 改动重启 Extension Host。类型测试通过不代表完成编辑器验收。

### S05 的专门核验

`SceneTagBar` 缺少 `tags` 如果符合子组件声明，应保留诊断。只有在存在默认值、合法平台属性、候选合并或实际传参却仍误报时才立项修复，并补充最小用例。`wx:if` 本身不构成免除必传 props 的理由；验收不能以删除警告或让所有 props 可选为目标。当前只列为核验项，不额外计一项“必传属性 bug”或重复成本。

## 7. 初始反馈盘点的验证与限制

- 已按当前源码逐项核对，不修改运行时代码、测试 fixture、调试配置或 changelog；8 张截图按原始字节仅本地归档，不纳入 Git 提交。
- Node `v24.11.0`、pnpm `11.22.0` 符合根目录声明。尝试标准 `pnpm exec vitest run ...` 时，pnpm 触发依赖状态检查并试图 install，因无 TTY 中止；未强制清理或重装依赖。
- 随后直接调用现有 `./node_modules/.bin/vitest run packages/language-core/__tests__/typedComponentProps.spec.ts packages/language-core/__tests__/jsonUsingComponents.spec.ts packages/language-service/__tests__/templateCustomDataConcurrency.spec.ts`：**3 个测试文件、19 个测试通过**。这是已有 props / JSON / 并发请求的基线验证，不代表本轮反馈已逐个复现或修复。
- 本轮没有启动 F5 Extension Host、没有执行 Vue 双插件共存实验；未运行全量 build / lint，因交付仅为文档与原始截图。文档本身单独检查格式、链接和反馈覆盖。
- 尚缺用户实际版本、最小代码与期望说明的项目保留“待复现”；特别是 U10、S05、S06 的内部类型显示以及 S08 的缺失范围，不作未经验证的根因结论。
