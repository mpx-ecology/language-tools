# 索引签名 Mixin 模板上下文验证

关联 Issue #198。通过 F5 在 Extension Development Host 中打开本目录进行手动验收：

1. 打开 `index.mpx`：
   - 第 3 行 `showFallback` 悬停为 `boolean`，F12 跳转到 `store.ts` 的 `StoreState.showFallback`；`title` 悬停为 `string`，F12 跳转到本文件 `data.title`。
   - 第 5 行 `statusText` 悬停为 `"fallback" | "active"`，F12 跳转到 `store.ts` 的 `StoreGetters.statusText`。
   - 第 7 行 `handleReset` 与 `displayLabel` 均保留准确类型并跳转到本文件对应声明。
   - 第 9 行 `fromMixinData` 悬停为 `string`，F12 跳转到 `typedMixin` 中的声明。
   - 第 11 行 `title.nonExistent()` 保留故意的 TS2339 错误提示。
2. 打开 `ref-parent.mpx`：
   - `refs.child?.focusInput(1)` 悬停返回 `number | undefined`，F12 在 `focusInput` 上跳转到 `child-with-mixin.mpx` 的 `methods.focusInput`。
   - 第 4 行 `label="{{ 123 }}"` 保留故意的 TS2322，第 14 行 `focusInput('bad')` 保留故意的 TS2345。
3. 打开 `mixin-override.mpx`：
   - 第 3 行 `kind` 悬停为 `"b"`，F12 跳转到 `mixinB` 的 `kind`（后一个 mixin 覆盖前一个 mixin）。
   - 第 5、6 行 `left` / `right` 分别悬停为 `string` / `number`，F12 分别跳转到 `mixinA` / `mixinB`。
   - 第 8 行 `compKind` 悬停为 `"cb"`，F12 跳转到 `mixinB` 的 `computed.compKind`。
   - 第 10 行 `kind.nonExistent()` 保留故意的 TS2339 错误提示。
