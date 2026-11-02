# JSON JS 语义功能验证（#138）

在本 worktree 根目录打开 VS Code，按 F5 启动 `VSCode Extension`。等待 watch 完成；已打开的 Extension Host 执行 `Mpx: Restart Server`。

1. 打开 `index.mpx`，在 JSON 内检查 `config` 的定义、引用、F2 重命名，以及 `title/count` 的悬浮类型、属性补全、`formatTitle` 的签名提示。JSON 和业务 script 的同名变量应隔离。
2. 对 `require('./shared')` 路径和 `shared.title` 执行 F12，应进入 `shared.js`。修改 `shared.js` 的 title 为数字（不保存），回到 JSON，hover 应变为 number，调用参数出现 TS2345；执行 `Mpx: Restart Mpx and TS servers` 后仍应如此。关闭 `shared.js` 并选择不保存后，hover 恢复 string，参数错误消失。另在打开首个 Mpx 文件前先修改并保持该 JS 缓冲区，检查扩展激活时也能同步已有修改。
3. 检查组件路径链接及模板组件导航仍正常；在 JSON 重命名变量后，编辑只应落在该 JSON 块中。撤销修改。
4. 打开 `errors.mpx`，逐项核对注释中的预期错误。每个错误只出现一次，路径错误范围不包含引号。该文件专门包含诊断用错误，不用于实际运行。
5. 打开 `inline.mpx`，检查行内 JSON 的 F12、hover 和路径链接；将文件行尾切换为 CRLF 后重复检查。打开 `json-only.mpx` 检查没有业务 script 的情况。
6. 修改或添加 JSON 变量后立即检查补全；新建、删除一个同目录共享 JS 文件并更新 require 路径，检查结果刷新。完成后撤销测试改动。

7. 打开 `environment.mpx`，JSON 中 `__dirname`、`__filename`、`__json_project_label__` 应为 string，且没有未定义错误；注入的两个变量 F2 应提示不可重命名，用户自己声明的局部变量仍可改名；后者 F12 应跳到 `project-globals.ts`。本目录显式使用 `types: []` 验证无需整套 Node 类型。
8. 分别格式化 `format-js.mpx` 和 `format-json.mpx`。开始标签与代码应分行，连续格式化结果一致；切换 LF / CRLF 后重复检查。完成后撤销测试改动。

连续编辑回归：在 `errors.mpx` 的逻辑 `<script setup>` 上加上 `lang="ts"`，等待诊断出现后再去掉，再加回。整个过程中 JSON 内预期的 4 个错误都应保留，JSON 中局部变量的定义跳转也应正常，无需刷新窗口。

此目录使用独立 tsconfig 开启 checkJs，不改变其他 F5 场景的诊断设置。项目自定义构建变量在 globals.d.ts 中声明。

首版覆盖从 JSON 块发起的语义请求；从独立 JS 文件发起的反向全工程引用或重命名仍由内置 tsserver 负责。语法高亮保持现有 TextMate/provider 的职责。

内部视图分工：`json_js` 保留原文并用于格式化和路径功能；`json_service` 只提供 TypeScript 语义分析，内部环境声明不会写回源文件。IDE 的普通逻辑 script 请求不会启动 JSON TypeScript Program。项目的原生 tsconfig 根文件保留，以继承直接或间接的全局类型增强。
