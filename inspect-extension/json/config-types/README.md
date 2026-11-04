# 动态 JSON 配置字段提示（U07 / T13，#154）

此场景使用已通过 #142 合入 main 的 JSON JS 语义与源码映射。使用本 worktree 的开发扩展，F5 后等待 watch 完成；服务更新后执行 `Mpx: Restart Server`。请使用独立 Extension Host，避免影响其他验收窗口。

1. `index.mpx`：按注释检查字段补全、boolean/枚举值补全及 schema 文档 hover；在 `config` 和自定义字段上检查 #142 的 JS hover、F12 和方法补全仍正常。移除一个字段后再触发补全，候选应立即刷新；撤销测试改动。
2. `errors.mpx`：保留四个故意错误，每个只显示一次 `mpx-json-schema` warning，范围仅覆盖错误值。把标题 42 改成字符串后，对应 warning 应立即消失；撤销。
3. `dynamic.mpx`：条件两支对象有字段提示；变量值和未知平台字段不应出现 schema warning。将 component 改成空值后触发补全，应提供 true / false。
4. 将上述文件切换为 CRLF，或把开始标签与代码放在同一行，重复检查补全编辑和 warning 范围；撤销。

首批复用现有 schema 的顶层字段，并接受未知字段。不执行配置、不注入类型断言，也不改变 JS 推断。支持直接 `module.exports = {}`、条件表达式对象及直接导出的顶层 const 对象。函数结果、运行时计算值、其他作用域对象、`exports.foo` 和逐项构建配置不推测 schema 值；可能被修改/传给函数的 const 对象仅提供提示，不校验初始值。嵌套 schema、完整应用/页面/组件及平台分层留待可靠上下文建立后扩展。

截图复现使用独立的修复前基线目录与本分支开发扩展，分别打开同一份 `errors.mpx` / `index.mpx`，保持编辑器主题、字号、窗口大小和视图一致。Issue 正文附真实复现图，PR 正文附修复前后对比；截图上传为 GitHub attachments，不提交图片文件。

此目录提供手动场景；是否完成真实 Extension Host UI 验收以 PR 验证表为准，语言服务自动化不代替 UI 截图。

## 覆盖后的配置诊断回归

打开 `overwritten.mpx`：旧导出及被覆盖的 `component` 字符串不应出现 warning；仅最后 `navigationBarTitleText = 42` 出现 `mpx-json-schema(4002)`，范围为 `42`。导出对象中的字段补全与 hover 继续可用。
