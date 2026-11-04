# mpxTagName（U02 / T02）

用本 worktree 启动独立 Extension Host，等待 watch 完成后运行 `Mpx: Restart Server`，打开 `index.mpx`。两处 ❌ 是故意保留的类型错误。本目录使用局部 `tsconfig.json`，只包含本场景的两个 Mpx 文件；`env.d.ts` 引用真实 `@mpxjs/core` 类型，避免 TypeScript 将纯 Mpx 项目误报为无输入文件。

- 检查静态标签值的语义高亮、props hover、属性和事件补全；在 `mpxTagName=""` 内触发补全应包含内置标签与 JSON 注册的 `tag-panel`，接受补全只替换引号中的值。
- 在 `tag-panel` 值上 F12 / Cmd 点击应打开本目录 `panel.mpx`。`title` 类型及定义仍来自子组件。
- 在外层 `<view>` 名称上测试联动编辑，结束标签仍为 `</view>`；输入 `<view mpxTagName="input">` 后自动闭合仍为 `</view>`。
- 无活动平台时补全展示所有静态候选；属性有 `@平台` 条件时只与可能同时生效的标签进行类型检查。无条件 `mpxTagName`（包括空值）优先于条件声明；重叠条件取第一个匹配项，和 Mpx 编译器一致。共用属性的 hover 显示各候选标签的来源和类型；相同诊断合并相关声明位置。

边界：编译器消费的是原样字符串，不会在 `mpxTagName` 中求值 Mustache。本次只识别完整静态标签名，不推断 `{{ tag }}`、字符串拼接或实体转义。无活动平台时不选择某个 RN 平台，不引入平台路径解析，也不扩展 React 原生组件注册类型。

组件身份约定（供 T03/T04 对接）：`templateNodeTags.name/startTagOffset/endTagOffset` 表示有效身份及它在模板中的实际拼写。`mpxTagName` 的起点在属性值，结束偏移为空；新增的 `sourceTag` 保留原始外层标签及开闭范围，`condition` 保留原始平台条件文本。原 AST 不改名；已有 JSON 组件解析、TS props 请求与 definition provider 直接复用有效身份。

自动回归位于 core/service 的 `mpxTagName.spec.ts` 及 `vscode/__tests__/mpxTagNameHighlighting.spec.ts`，不依赖本目录。真实 UI 验收状态见 PR 验证表。
