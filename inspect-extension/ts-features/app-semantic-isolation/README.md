# app.mpx 跨文件语义隔离与首轮同步验收

## 场景说明

1. `pure-json-app/`：纯 `<script name="json">` 的 `app.mpx` 与其消费页面 `pages/index.mpx`、`pages/result.mpx`。
2. `script-app/`：同时包含业务 `<script lang="ts">` 与 `<script name="json">` 的 `app.mpx` 与其消费页面 `pages/index.mpx`。

## 手动验证步骤（F5 Extension Host）

1. 先打开 `pure-json-app/pages/index.mpx`（以及 `pages/result.mpx`）并等待 Mpx 服务就绪，再打开 `pure-json-app/app.mpx`。
   - **预期**：`pure-json-app/app.mpx` 仅保留 JSON JS 语法/语义着色，不出现来自子页面偏移映射的错位属性高亮（例如 `'./pages/index'` 字符串或 `</script>` 闭合标签变蓝）。
2. 打开 `script-app/pages/index.mpx` 后再打开 `script-app/app.mpx`。
   - **预期**：`script-app/app.mpx` 保留自身 `appReady` 变量的高亮、hover（`const appReady: string`）以及预期的 TS2322 诊断，不被子页面接管。
3. 在 `pure-json-app/app.mpx` 修改 `demo-panel` 注册名称、清空后恢复 `<script name="json">` 区块，然后直接切到 `pure-json-app/pages/index.mpx` 触发模板标签补全与属性悬停。
   - **预期**：无需先重新编辑子页面，子页面在首轮请求即可获得最新全局组件注册与类型诊断。
