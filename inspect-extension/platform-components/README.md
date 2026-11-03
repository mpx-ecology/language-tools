# T04 多平台组件路径验收

关联 [Issue #148](https://github.com/mpx-ecology/language-tools/issues/148)。✅ 为正确行为；❌ 为故意错误，保留对应诊断。

在本 worktree 的独立 Extension Host 打开本目录，等待构建并执行 `Mpx: Restart Server`。自动化 fixtures 位于 language-core 的 `__tests__/fixtures/platform-components`，不依赖本目录。

- `index.mpx`：未指定活动平台。模板标签开闭位置 F12 / Cmd 点击应保留普通、ios 两个真实文件，alias / query 不增加重复文件；JSON 路径 F12 返回同一组候选。显式 `.ios.mpx?mode=ali` 只跳到该 ios 文件；仅有 ios 的组件无路径 4001。boolean 是故意的 props 错误。
- `selected/index.mpx`：配置 `mpxCompilerOptions.mode = android`，缺少 android 文件时只使用 ios 的 number 类型；`value="bad"` 为故意的 TS2322。hover、补全、诊断及标签 / JSON 路径导航应保持同一来源。
- 在本目录临时复制 `panel.mpx` 为 `panel.android.mpx`：selected 场景的类型和跳转应切换为 android 的 string；重命名或删除后应回退 ios，无需编辑父文件。验收后删除临时文件。

## 文件选择规则与边界

`tsconfig.json` 可使用 `mpxCompilerOptions.mode` / `env` 声明与 MpxWebpackPlugin 一致的文件目标。mode 已知时依次选择目标平台、Android / Harmony 的 ios fallback、普通文件；每层先尝试 `.env`。未配置 mode 时保留普通与支持平台中实际能解析的文件，按真实路径去重；不会猜测任意业务 env。没有默认硬编码 ios。

usingComponents 的 `?root=` 等 query 保留在原始注册和补全映射中。普通资源的 `?mode=` / `?env=` 不等价于 webpack 的文件编译目标。显式平台文件已有支持，本项保留；两个不同真实文件不是重复定义。相对路径、tsconfig paths / baseUrl、普通 npm package main、目录 index 共用文件选择规则。

本项不执行 JSON JS 分支，不筛选 SFC 区块，不读取或执行 webpack 配置；自定义 webpack alias / fileConditionRules / miniprogram 包入口重写不在本项。运行时 plugin:// 组件没有本地源码，不提供文件跳转。反向查找与自动注册由后续任务处理。

验证记录见修复 PR；未执行真实 UI 验收时不得将本清单视为通过。

## 实际 Extension Host 验证

2026-11-03，Code Insiders 1.145.0-insider、工作区 TypeScript 6.0.3，在本 worktree 的独立用户数据目录中仅加载开发扩展，调用真实 VS Code providers 验证通过：

- 模板及 JSON 路径保留普通 / ios 候选；显式平台 query 与仅有 ios 的组件可跳转。
- Android 缺省时，属性 hover 为 number；故意 string 报 TS2322，无路径 4001。
- 在 include 之外新建 `panel.android.mpx` 后，未修改父文件，定义切到 android、hover 变为 string，故意 number 报 TS2322；删除后定义回退 ios。

真实编译器验证了独立自动化 fixtures 的 Mpx SFC / setup / 模板语法。完整自动化和命令结果见 PR；未进行截图或主题视觉验收。
