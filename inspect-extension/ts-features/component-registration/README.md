# T06 模板组件自动注册

关联 [Issue #146](https://github.com/mpx-ecology/language-tools/issues/146)。使用本分支 F5 Extension Host，等待 watch 构建后执行 Mpx 重启服务器。验收前关闭普通单词建议，避免把文字候选误认为语言服务候选。

本目录的 app.mpx 构成独立应用边界。候选仅来自该应用工作区内静态声明 `component: true` 的普通 `.mpx` 文件；文件名转为 kebab-case，`index.mpx` 使用目录名。候选显示来源路径，同名文件保留独立选择。当前不扫描 node_modules、产物目录、其他应用或平台后缀文件。

1. 打开 `merge-json.mpx`，将第一个标签名改成 `demo-ca` 并触发补全，选择带来源路径的 `demo-card`。✅ 标签与 usingComponents 同时修改，已有注释、路径和缩进保持原样，新路径沿用无扩展名风格。✅ 一次撤销恢复接受前的标签和配置；再次触发仍有候选。
2. 打开 `merge-js.mpx`，同样接受候选。✅ 合并 module.exports 的对象字面量，保留单引号、行尾注释、尾逗号和 `.mpx` 扩展名。❌ 不应把普通业务 script 的导入改成组件 import。
3. 打开 `no-config.mpx`，接受候选。✅ 创建有效 `<script type="application/json">`；一次撤销同时恢复标签和新建区块。
4. 对任一文件中的完整 `<demo-card />` 标签名执行 Quick Fix。✅ 提供带路径的注册操作，使用单个 WorkspaceEdit；接受后重复触发无重复注册操作。
5. ✅ `global-card` 已在 app.mpx 注册，不提供会重复写入局部 usingComponents 的自动注册候选。全局标签补全的增强由 T09 负责；已有 TypeScript 组件名也用于去重。
6. 打开 `dynamic-config.mpx`，对 demo-card 执行 Quick Fix。❌ 配置包含 require 与对象展开，自动注册操作应禁用并说明原因；不得执行配置或改写原对象。
7. 将 `components/demo-card.mpx` 改名、删除或把 component 改为 false 后再次触发补全。✅ 候选更新；撤回这些修改后恢复。新建静态 component:true 的 .mpx 后也应出现新候选。
8. 注册成功后 ✅ 标签 hover、属性补全和 F12 应沿用现有已注册组件能力；删除注册后重新接受应恢复。❌ 当前文件的已注册同名项、当前组件自身和内置标签不应被自动注册候选覆盖。

## 范围

静态 JSON（含注释）与单条 `module.exports = { ... }` 的静态 JS 字面量可编辑。动态表达式、展开、外部 src、重复区块/键、条件注册和语法错误应手动处理。保留已有路径；新增项优先复用现有已配置且唯一的 tsconfig 别名前缀，否则使用相对路径。不会执行用户动态配置。

RN `components` + 脚本 import 依赖 T03，暂不提供；多平台候选增强和完整全局来源由 T04/T09 接入。自动化 fixtures 位于 language-service 的 `__tests__/fixtures/component-registration`，不依赖本目录。

## 验证记录

2026-11-03，VS Code Insiders `1.145.0-insider`、工作区 TypeScript `6.0.3`，在本分支专用 Extension Host 与用户数据目录中，调用实际 providers 并执行真实建议接受命令：

- ✅ `merge-json.mpx`、`merge-js.mpx`、`no-config.mpx` 均同时修改标签和配置；一次 undo 精确恢复接受前全文，TS/LSP 同步后候选恢复。
- ✅ JSON 保留注释和无扩展名路径；JS 保留单引号、注释、尾逗号和扩展名；无配置时创建有效区块。
- ✅ 注册后 F12 均跳到 `components/demo-card.mpx`；再次补全无重复自动注册项。
- ✅ Quick Fix 使用一个 WorkspaceEdit，应用后一次 undo 恢复全文。
- ✅ 全局组件不重复局部注册；新增/删除组件文件后候选更新。
- ✅ 动态配置不提供可执行编辑。禁用原因由独立 language-service 测试验证；VS Code 的公开 code-action 查询会过滤禁用项，本次未把这一查询当成禁用提示的视觉验收。

自动化专项另覆盖旧文档拒绝编辑、异步主标签插入与无关改动的区别、重复键/区块、外部配置、条件配置、CRLF/Tab、别名路径和普通 HTML 补全解析。若无扩展名写法可能解析到另一个目录 index，会保留显式 `.mpx` 以确保注册的是选中的文件。真实宿主记录保存在本会话本地，未提交截图或临时测试 runner。
