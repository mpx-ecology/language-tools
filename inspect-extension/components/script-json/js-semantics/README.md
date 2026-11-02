# JSON JS 语义功能验证（#138）

在本 worktree 根目录打开 VS Code，按 F5 启动 `VSCode Extension`。等待 watch 完成；已打开的 Extension Host 执行 `Mpx: Restart Server`。

1. 打开 `index.mpx`，在 JSON 内检查 `config` 的定义、引用、F2 重命名，以及 `title/count` 的悬浮类型、属性补全、`formatTitle` 的签名提示。JSON 和业务 script 的同名变量应隔离。
2. 对 `require('./shared')` 路径和 `shared.title` 执行 F12，应进入 `shared.js`。修改 `shared.js` 的 title 为数字（不保存），回到 JSON 检查类型刷新与参数错误；恢复后错误消失。
3. 检查组件路径链接及模板组件导航仍正常；在 JSON 重命名变量后，编辑只应落在该 JSON 块中。撤销修改。
4. 打开 `errors.mpx`，逐项核对注释中的预期错误。每个错误只出现一次，路径错误范围不包含引号。该文件专门包含诊断用错误，不用于实际运行。
5. 打开 `inline.mpx`，检查行内 JSON 的 F12、hover 和路径链接；将文件行尾切换为 CRLF 后重复检查。打开 `json-only.mpx` 检查没有业务 script 的情况。
6. 修改或添加 JSON 变量后立即检查补全；新建、删除一个同目录共享 JS 文件并更新 require 路径，检查结果刷新。完成后撤销测试改动。

连续编辑回归：在 `errors.mpx` 的逻辑 `<script setup>` 上加上 `lang="ts"`，等待诊断出现后再去掉，再加回。整个过程中 JSON 内预期的 4 个错误都应保留，JSON 中局部变量的定义跳转也应正常，无需刷新窗口。

此目录使用独立 tsconfig 开启 checkJs，不改变其他 F5 场景的诊断设置。项目自定义构建变量在 globals.d.ts 中声明。

首版覆盖从 JSON 块发起的语义请求；从独立 JS 文件发起的反向全工程引用或重命名仍由内置 tsserver 负责。语法高亮保持现有 TextMate/provider 的职责。
