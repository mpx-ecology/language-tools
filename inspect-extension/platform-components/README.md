# T04 多平台组件路径验收

关联 [Issue #148](https://github.com/mpx-ecology/language-tools/issues/148)。✅ 为正确行为；❌ 为故意错误，保留对应诊断。

在本 worktree 的独立 Extension Host 打开本目录，等待构建并执行 `Mpx: Restart Server`。自动化 fixtures 位于 language-core 的 `__tests__/fixtures/platform-components`，不依赖本目录。无需配置 IDE 活动平台。

- `index.mpx`：模板标签开闭位置 F12 / Cmd 点击应列出普通、ios 两个真实文件，由用户选择；alias / query 不增加重复文件。JSON 路径 F12 返回同一组候选。显式 `.ios.mpx?mode=ali` 只跳到该 ios 文件；仅有 ios 的组件无路径 4001。boolean 是故意的 props 错误。
- `explicit.mpx`：显式引用 ios 文件，hover 保留 number；`value="bad"` 为故意的 TS2322。query 不改变类型和导航目标。
- 在本目录临时复制 `panel.mpx` 为 `panel.android.mpx`：`index.mpx` 的定义列表应新增 Android 文件，保留普通 / ios 文件；重命名或删除后同步更新，无需编辑父文件。验收后删除临时文件。

## 文件解析规则与边界

IDE 不推断当前构建的 mode / env，也不提供活动平台配置。对一个路径先按 Mpx 规则解析普通文件，再汇总各个可能平台下的实际目标；平台内部保留 Android / Harmony 的 ios fallback 等规则。优先级用于各个平台内的文件选择，不在不同平台之间选出唯一赢家。相对路径、tsconfig paths / baseUrl、普通 npm package main、目录 index 使用同一规则。

两个不同真实文件都是合法跳转候选；仅 alias / query 等指向同一实际文件时去重。选择某个定义只是打开文件，不改变类型检查的平台。组件类型沿用已有多路径机制聚合候选，不通过 any 屏蔽错误。

usingComponents 的 `?root=` 等 query 保留在原始注册和补全映射中；`?mode=` / `?env=` 不等价于 webpack 的构建参数。显式平台 / 环境文件路径继续可用；业务 env 没有固定枚举，不将任意点分文件名猜作环境候选。

本项不执行 JSON JS 分支、不筛选 SFC 区块、不读取或执行 webpack 配置；自定义 webpack alias / fileConditionRules / miniprogram 包入口重写不在本项。plugin:// 组件没有本地源码。反向查找与自动注册由后续任务处理。

验证记录见修复 PR；上述更新场景需重新验证，不沿用旧的活动平台配置验收结果。未进行截图或主题视觉验收。
