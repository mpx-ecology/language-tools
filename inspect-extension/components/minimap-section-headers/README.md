# Minimap 节标题（#117）

按 F5 启动 `VSCode Extension`，等待 watch 构建完成。修改语言配置、TextMate 语法或扩展清单后，需要重启 Extension Host。

检查工作区设置中以下三项均为 `true`；本检查工作区已启用：

```json
{
  "editor.minimap.enabled": true,
  "editor.minimap.showMarkSectionHeaders": true,
  "editor.minimap.showRegionSectionHeaders": true
}
```

打开 `index.mpx`，确认 language id 为 `mpx`。预期 template、TypeScript script 和 Stylus style 中共有八个 `MARK:` 注释标题，包括两处多行注释；位置与源码行对齐，`MARK: - 列表` 显示分隔线。三个 `#region` 注释也应显示标题。编辑标题或在其前面插入空行，minimap 应同步更新。

打开 `javascript.mpx`，确认普通 JavaScript script 和默认 CSS style 的 `MARK:`、`#region` 标题也能显示。打开 `control.ts` 对照，标题表现应与 `.mpx` 的 script 块一致。

属性值、普通模板文本、脚本字符串、跨行模板字符串和样式字符串中的 `MARK:` 都不应生成标题。普通注释、脚本变量和样式应保持原有高亮；变量 hover、补全和跳转应正常。

`index.mpx` 使用 Mpx 的 `defineExpose({ list, onScroll })` 将模板用到的数据和方法暴露出去，唯一字符串列表使用 `wx:key="*this"`。该场景没有故意制造类型错误，模板中的 `list`、`item` 和 `onScroll` 应能正常识别。

分别关闭 `showMarkSectionHeaders` 和 `showRegionSectionHeaders`：各自只隐藏对应类型的标题。测试结束后恢复为 `true`。编辑器的默认标题扫描器可能把 `-->`、`*/` 一起显示在标题末尾，这与标题缺失是不同的行为。

使用 `Developer: Inspect Editor Tokens and Scopes` 检查 `MARK:`：应包含原有的 `comment.*` 和新增的 `meta.section-header.mpx`，标记 token 的 language 为 `mpx`。同一行其余注释、普通注释和代码仍使用所在块的语言。这兼容仍会过滤嵌入语言 MARK 标记的旧版 VS Code / Cursor；新版编辑器也应显示相同标题。
