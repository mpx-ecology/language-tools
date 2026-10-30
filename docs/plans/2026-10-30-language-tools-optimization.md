# Mpx Language Tools 用户反馈分析与优化计划

日期：2026-10-30。分析基线：本仓库 `84c7cb3`，`vscode/package.json` 版本 `1.24.3`。状态：初步分析与建议排期。后续进展：T17 已确认 Vue 2.7 全局宏冲突，实现已提交 [PR #120](https://github.com/mpx-ecology/language-tools/pull/120)，待合并及 F5 验收，详见[排查记录](../feedback/2026-10-30-vue-macro-coexistence.md)；其余条目仍按本计划推进。

本轮原始 10 条反馈及 8 张截图索引见[反馈归档](../feedback/2026-10-30-user-feedback.md)。本文将它们拆成 18 个可验收工作项，分别记录已有能力、缺口、优先级和成本。反馈中重复出现的补全、自动导入和 class 能力只计一次。

## 1. 判断与建议顺序

优先处理类型服务稳定性，再补组件识别与类型链路，最后扩展全局查找和自动注册。

1. **Vue 共存报错先做最高优先级排查。** 若可稳定复现合法 Mpx / Vue 代码大面积误报，按 P0 修复；目前不能认定根因就是“两边修改 tsserver 类型”。
2. **RN 组件注册、多平台解析、refs 是主要基础缺口。** 它们会同时影响补全、hover、诊断、导航和引用，应围绕同一组件身份与类型来源修复。
3. **动态 class、静态 JSON、CSS 补全和标签编辑适合独立交付。** 多数已有服务入口，先定位覆盖范围或接线问题，避免重做已有能力。
4. **自动注册与反向引用依赖稳定的组件解析。** 先明确平台、别名、全局注册与局部注册规则，再决定是否需要新索引，避免先建一套与现有 TS 解析不一致的系统。
5. **新增警告要对准真实的实例冲突。** 保留普通局部变量 `data`；不能通过放宽为 `any`、全局关闭诊断或屏蔽导航来消除反馈。

这里区分三类结论：**源码确认**表示已定位当前实现或明确缺口；**推断**表示有源码依据但尚未完成端到端复现；**待复现**表示缺少输入或无法仅凭截图判断。源码确认不代表已在用户版本复现。

## 2. 现有能力与代码证据

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
| E12  | [CSS 服务](../../packages/language-service/src/plugins/mpx-sfc-style-css.ts)复用 `volar-service-css`，[Stylus 服务](../../packages/language-service/src/plugins/mpx-sfc-style-stylus.ts)单独处理；[inline CSS](../../packages/language-core/src/plugins/mpx-template-inline-css.ts)也已有入口。  | 标准 CSS 属性补全已接入；缺失可能与 `lang`、内嵌映射、触发位置或平台扩展有关。                                                                           |
| E13  | [JSON 服务](../../packages/language-service/src/plugins/mpx-sfc-json-json.ts)注册 Schema，[Schema](../../packages/language-service/src/data/mpxJsonSchema.ts)含 `component`、`usingComponents` 和部分页面配置；[服务注册](../../packages/language-service/src/index.ts)未启用 JSON-JS 专用插件。 | 静态 JSON 是覆盖与激活排查；动态 JS 配置缺少专用配置类型服务，不等于 JS 语法完全无支持。                                                                 |
| E14  | [客户端](../../vscode/src/languageClient.ts)调用 `activateAutoInsertion`，模板服务继承 HTML provider。当前安装的 `volar-service-html@0.0.70` 提供 auto insertion 和 linked editing，分别读取 `html.autoClosingTags` 等配置。                                                                     | 标签闭合和联动重命名已有底层能力；需检查协商、映射与 `editor.linkedEditing`，不能只添加括号规则。依赖实现只作为本地只读检查证据。                        |
| E15  | [上下文生成](../../packages/language-core/src/codegen/script/template.ts)用对象展开合并字段；[全局类型](../../packages/language-core/src/codegen/globalTypes/index.ts)使用 `declare global` 和大量 `__VLS_*` 名称。                                                                              | 展开覆盖不会自动产生业务期望的重名警告；共享全局命名与 Vue 共存是否冲突需要隔离实验。                                                                    |
| E16  | [扩展激活](../../vscode/src/client.ts)拦截 `fs.readFileSync`，按内置 TS 扩展打包字符串做兼容补丁；[TS 插件](../../packages/typescript-plugin/src/index.ts)装饰语言服务，[声明配置](../../vscode/package.json)包含 TS 插件注册。                                                                  | 共存风险面包括宏声明、全局 helper、host 装饰和客户端补丁；目前没有证据足以锁定单一根因。                                                                 |

框架语义还只读参考了相邻 `mpx-core` 仓库 `daac8230c`：`packages/core/@types/index.d.ts` 的 Context / 全局宏声明，`packages/core/src/core/proxy.js` 的冲突处理，`packages/core/src/index.js` 的保留名，以及 `getDefaultOptions.ios.js` 的 Hooks 返回值合并。该源码不随本文归档，实施时需再与复现项目安装版本核对。RN 注册方式同时参考了本地 mpx2rn 技能的混合开发说明。

## 3. 工作项、优先级与成本

P0：已复现且阻断基础编辑的兼容性问题，应立即修复；本轮只有 T17 是**条件性 P0**。P1：高频能力缺口或可能造成类型 / 导航错误。P2：能力扩展、较低阻断问题或依赖前序基础的增强。优先级与实施难度分开评估，低成本项目可独立先交付。

成本为熟悉仓库的单名工程师的有效人日，包含对应 fixture、关键自动化断言和手动场景准备；不含等待用户样例、外部依赖修复和大规模架构迁移。区间是初估，完成复现后再调整。影响成本除代码量外，还包括诊断、映射、性能和其他平台回归。

| 工作项 | 范围 / 反馈来源                                               | 判断                                              | 优先级    | 人日 | 主要改动层与影响成本                                                                            |
| ------ | ------------------------------------------------------------- | ------------------------------------------------- | --------- | ---- | ----------------------------------------------------------------------------------------------- |
| T01    | 样式条件编译高亮与指令补全（U01、U02）                        | 部分已有；触发覆盖缺口源码确认                    | P2        | 1–2  | vscode grammar、language-service；低。需避免破坏 CSS / Stylus 注释边界。                        |
| T02    | `mpxTagName` 标签值的语义与高亮（U02）                        | 专用处理缺口源码确认；具体样例待复现              | P1        | 3–5  | language-core、service、TS plugin、grammar；高。标签身份与源码 range 会影响所有模板能力。       |
| T03    | RN `components` 注册别名、props、事件和导航（U03、U06 / S03） | 注册表与 React 类型接入不足为源码推断             | P1        | 4–7  | language-core、TS plugin、service；高。React 函数 / 类 / forwardRef 类型与 Mpx 类型需兼容。     |
| T04    | 多平台组件解析与正向跳转（U03 / S04）                         | 后缀自动解析缺口源码确认；两处定义是否异常待复现  | P1        | 4–6  | core resolver、生成 import、definition；高。影响类型候选、路径补全与缓存。                      |
| T05    | 从组件查使用方及多平台反向引用（U03）                         | TS 映射已有；端到端覆盖待测                       | P2        | 5–8  | core navigation、TS plugin，必要时 service 索引；高。跨文件性能、路径去重和动态配置边界。       |
| T06    | 模板候选接受后自动写入 `usingComponents`（U03、U06）          | TS import 有基础；JSON 注册链路缺口源码确认       | P2        | 4–7  | completion resolve / code action、配置 AST 编辑；高。跨区块编辑、撤销、动态配置及路径风格。     |
| T07    | `useContext().refs` 精确实例类型（U04 / S06）                 | refs 生成缺口源码确认；截图方法行为待复现         | P1        | 5–8  | core ref 元数据、组件公开类型、脚本映射；高。空值、数组、RN 与多平台实例类型。                  |
| T08    | 动态 class 跳转及 class 名补全（U05、U06 / S07）              | Mustache 对象 key 漏收集路径源码确认              | P1        | 2–4  | core class AST 与映射、service links；中。类名和表达式变量必须分别导航。                        |
| T09    | 已注册全局组件的标签补全（U06）                               | 类型基础已有；全局来源与补全覆盖待测              | P1        | 2–4  | 应用配置 / 类型来源聚合、service；中。应用边界、同名覆盖与缓存。                                |
| T10    | props / expose / Hooks 变量补全与 hover（U06）                | 已有类型合并；复杂写法待复现                      | P1        | 2–3  | setup 解析、ctx 生成、TS completion；中。Ref 解包、泛型、导航和重复映射。                       |
| T11    | 内建标签属性、平台属性和事件补全（U06）                       | 已有元数据；具体漏项待复现                        | P2        | 2–4  | template data、内建类型、事件生成；中。平台误提示和补全 / 校验不一致。                          |
| T12    | 静态组件 JSON Schema 提示（U07 / S08）                        | 能力存在；实际缺项或激活问题待复现                | P1        | 1–2  | JSON Schema、文档匹配、SFC 嵌入；低。保留注释、尾逗号和已有页面提示。                           |
| T13    | 动态 `<script name="json">` 配置类型提示（U07）               | 专用插件未启用源码确认；具体体验待测              | P2        | 3–5  | JSON-JS 虚拟类型、service；中高。不能执行用户配置来获取类型。                                   |
| T14    | 自动闭合 / 标签联动重命名（U08）                              | 底层能力已接入；编辑器链路待复现                  | P1        | 1–3  | service capabilities、template mapping、客户端配置；中。半成品标签、自闭合标签与重复插入。      |
| T15    | props / expose / Hooks 同名警告（U09）                        | 未见专用静态冲突诊断；合并行为源码确认            | P1        | 3–5  | core 元数据、service diagnostics / related info；中高。键来源、spread、类型字段与运行时优先级。 |
| T16    | 实例暴露字段 `data` 的保留名警告（U09）                       | 框架有保留规则；编辑期诊断缺口为源码推断          | P1        | 1–2  | core 暴露 key 分析、service diagnostics；中。重点防止局部变量误报。                             |
| T17    | 与 Vue 插件共存时的 `defineProps` 误报（U10）                 | 已确认 Vue 2.7 全局宏冲突；修复见 PR #120，待验收 | 条件性 P0 | 3–7  | vscode 激活、TS plugin、全局 / 文件内类型；高。必须回归 `.vue / .mpx / .ts` 和插件加载次序。    |
| T18    | `<style>` CSS 属性补全恢复与覆盖（U06）                       | CSS / Stylus 服务已有；具体失效位置待复现         | P1        | 1–2  | style 嵌入映射、服务 selector、配置；低。若是预处理器深层解析问题需重新估算。                   |

18 项独立粗估合计 **47–84 人日**，仅用于展示完整范围量级；任务间有共用基础，部分待复现项可能只需配置说明或已有修复验证，因此不应直接作为交付承诺。另预留首轮复现 / 设计 2–3 人日及最终集成验收 2–3 人日。T17 如果需要上游 Volar / TS 适配或全局 helper 全面迁移，应单独重估，不包含在 3–7 日局部修复假设里。

## 4. 分组分析与修复边界

### 4.1 样式高亮、CSS 与标签编辑：T01、T14、T18

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
| B：独立体验修复，7–15 人日粗估    | T01、T08、T12、T14、T16、T18；只做已证实的覆盖与接线问题。                                                      | 样式指令、动态类名、JSON、标签编辑、保留字段有对应回归用例和 F5 验收。无需等待整套组件系统才能交付。           |
| C：组件与类型基础，23–38 人日粗估 | T02、T03、T04、T07、T09、T10、T15；先定组件元信息与平台解析，再接 RN / refs / 变量和冲突诊断。                  | 组件标签、props、事件、实例公开面、平台定义使用一致来源；诊断 / hover / 导航分别通过。                         |
| D：跨文件增强，14–24 人日粗估     | T05、T06、T11、T13；在稳定解析上补反向引用、自动注册、平台属性与动态配置。                                      | 查找结果完整且去重；注册编辑可撤销、幂等；大项目响应速度无明显退化。                                           |

阶段 B 的小修可以在阶段 C 的设计确认后独立推进；这里不假设多人并行，也不把多个区间机械换算成确定交付日期。T17 修复和 A 的复现预算不包含在 B–D 合计中。

关键依赖：T04 → T05 / T06 / T07 的多平台行为；T03 → RN props / refs 与 RN 自动注册；T09 → T06 的全局去重；T10 / T07 的类型来源分析可供 T15 复用。T17 若证明需要类型命名迁移，应在 C 的大规模类型改动前解决，避免重复返工。

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
