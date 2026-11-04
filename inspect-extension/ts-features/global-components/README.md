# T09 已注册全局组件验收

关联 [#150](https://github.com/mpx-ecology/language-tools/issues/150)。使用本 worktree 的独立 F5 Extension Host，等待 watch 完成并执行 Mpx 服务重启；不要操作其他会话的宿主。可关闭 editor.wordBasedSuggestions 排除文本候选。

- `app-a/pages/index.mpx`：✅ `<`、`<app-`、空模板起点均提供 app-panel / local-panel / TypedPanel / typed-panel / typed-dash；不提供未注册的 unused.mpx 或 privateField；接受候选不写 usingComponents。❌ 两处 number title 各报 TS2322；✅ title hover 为 string，属性 F12 回到 panel.mpx，app-panel 标签 F12 也到该文件。
- `app-a/pages/override.mpx`：✅ 局部 AppPanel 的拼写优先，只提供 count；❌ string count 报 TS2322。
- `app-a/sub/pages/index.mpx`：✅ 普通分包继承宿主全局；包入口 app.mpx 的 package-only 不成为候选。Mpx packages 仅贡献 pages/packages，不能合并调试用入口的 usingComponents。
- `app-b/pages/index.mpx`：✅ 提供 other-panel，其 props 来自 app-b/panel.mpx。GlobalComponents 是 TS 工程级声明，所以 AppPanel/TypedPanel 仍可能出现；AppPanel 的 mustNotLeak 来自类型声明，不是 app-a 的 title。应用 JSON 不跨应用混入。
- 在 app-a/app.mpx 将 app-panel 改名并将路径改为 ./local.mpx（可不保存）：✅ 页面候选与 props 更新为新名称 / count，关闭并丢弃后恢复。在 globals.d.ts 修改 TypedPanel 类型或增加名称，检查候选和 props 同步更新。恢复所有测试编辑。

## 范围

从文件祖先目录查找常规 app.mpx，以 tsconfig 目录为上界；静态 packages 字面量（含 root query 和嵌套入口）用于识别宿主关系。不会遍历全仓，也不执行配置代码。任意 webpack 入口名、祖先链外的共享包多宿主归属、动态求值后的 packages 关系不做猜测；这类项目仍可通过工程级 GlobalComponents 描述公开组件。

已有应用入口内的注册变更通过 Volar 关联刷新。删除入口会移除候选；首次新增、移动或删除后重建入口时，更新页面或重启 Mpx 项目以重新发现应用边界。

自动化在 language-core / language-service 的 registeredComponents.spec.ts，使用独立 fixtures，不依赖本目录。真实 UI 验收状态以 PR 验证表为准。

## 验证记录

2026-11-03，Code Insiders 1.145.0-insider，独立用户数据目录与扩展目录，仅加载本 worktree 开发扩展，通过真实 VS Code providers 验证：已注册标签候选、string props hover、应用标签 F12、两处预期 TS2322，以及未保存应用注册改名后的候选刷新。测试缓冲区恢复原文并关闭宿主。此轮执行的是 Extension Host API 验收，未做人工逐项视觉检查或截图。

IDE 服务回归另外覆盖未打开 app.mpx 的磁盘读取、打开缓冲区优先、关闭后回到磁盘，以及已跟踪应用文件的磁盘变更；无关文件事件不加载到项目。

## 真实截图最小场景

`screenshot-case` 为独立 tsconfig 下的同一组源码：app.mpx 只注册 app-badge，globals.d.ts 只声明 TypedBadge，页面只局部注册 local-badge，避免同名类型声明掩盖应用注册缺失。左右并排打开 app.mpx 与 pages/index.mpx；使用 Default Dark Modern、17px 字号，关闭文字建议及自动补全触发。

1. 在 app-badge 上方临时输入 `<app-` 并手动触发建议：基线缺少已注册的 app-badge，修复后出现“应用全局组件”。截图后撤销临时输入。
2. 保持完整页面并打开 Problems：故意的 number title 在基线未被应用组件类型检查，修复后出现 TS2322；TypedBadge 与 local-badge 的合法值不报错。
3. 修复前使用独立基线 60ebb13，修复后使用本 PR；每侧使用独立用户数据/扩展目录，截图和原生上传全程遵守共享桌面锁。图片仅作 GitHub attachments，不纳入 Git。

截图上传状态以 Issue #150 / PR #164 正文为准；此前 API 验收记录不能替代这些真实 UI 图。
