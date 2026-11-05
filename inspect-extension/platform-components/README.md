# T04 多平台组件路径验收

关联 [Issue #148](https://github.com/mpx-ecology/language-tools/issues/148)。✅ 为正确行为；❌ 为故意错误，保留对应诊断。

在本 worktree 的独立 Extension Host 打开本目录，等待构建并执行 `Mpx: Restart Server`。自动化 fixtures 位于 language-core 的 `__tests__/fixtures/platform-components`，不依赖本目录。无需配置 IDE 活动平台。

- `index.mpx`：hover 应显示可点击的 `panel.mpx` / `panel.ios.mpx`，不显示两个相同的 `./panel`；模板标签开闭位置 F12 / Ctrl/Cmd+单击应列出普通、ios 两个真实文件，由用户选择；alias / query 不增加重复文件。JSON 路径 F12 / Ctrl/Cmd+单击返回同一组候选；单目标链接的 tooltip 也显示真实文件名。显式 `.ios.mpx?mode=ali` 只跳到该 ios 文件；仅有 ios 的组件无路径 4001。boolean 是故意的 props 错误。
- `explicit.mpx`：显式引用 ios 文件，hover 保留 number；`value="bad"` 为故意的 TS2322。query 不改变类型和导航目标。
- 在本目录临时复制 `panel.mpx` 为 `panel.android.mpx`：`index.mpx` 的定义列表应新增 Android 文件，保留普通 / ios 文件；重命名或删除后同步更新，无需编辑父文件。验收后删除临时文件。

## 文件解析规则与边界

IDE 不推断当前构建的 mode / env，也不提供活动平台配置。对一个路径先按 Mpx 规则解析普通文件，再汇总各个可能平台下的实际目标；平台内部保留 Android / Harmony 的 ios fallback 等规则。优先级用于各个平台内的文件选择，不在不同平台之间选出唯一赢家。相对路径、tsconfig paths / baseUrl、普通 npm package main、目录 index 使用同一规则。

两个不同真实文件都是合法跳转候选；仅 alias / query 等指向同一实际文件时去重。选择某个定义只是打开文件，不改变类型检查的平台。组件类型沿用已有多路径机制聚合候选，不通过 any 屏蔽错误。

usingComponents 的 `?root=` 等 query 保留在原始注册和补全映射中；`?mode=` / `?env=` 不等价于 webpack 的构建参数。显式平台 / 环境文件路径继续可用；业务 env 没有固定枚举，不将任意点分文件名猜作环境候选。

本项不执行 JSON JS 分支、不筛选 SFC 区块、不读取或执行 webpack 配置；自定义 webpack alias / fileConditionRules / miniprogram 包入口重写不在本项。plugin:// 组件没有本地源码。反向查找与自动注册由后续任务处理。

## 点击和 Peek 验收

使用 VS Code 原有 `editor.gotoLocation.multipleDefinitions` 设置；默认 `peek` 时显示内嵌定义列表。如果用户改成 `goto`，遵循该偏好，不由扩展改写全局设置。

多目标注册路径 / 标签不再生成重叠 DocumentLink，以免源码 Ctrl/Cmd+单击被“打开首个链接”接管。hover 中仍保留指向各真实文件的显式链接；单目标保持直接链接，样式 class 等其他链接不受影响。

在 JSON 的 `./panel` 上实际 Ctrl/Cmd+单击，确认出现定义列表；不能只运行 F12 或 `executeDefinitionProvider` 就将鼠标手势验收记为通过。hover 链接点选应打开对应的具体文件。

验证记录见修复 PR；本轮 hover / 鼠标手势需重新做真实 UI 验收并补截图，不沿用旧 provider 结果。

## 下划线装饰验收

多目标注册路径和组件标签应持续显示下划线；装饰只负责外观，不重新注册 DocumentLink、不绑定点击。hover 继续显示真实文件名；Ctrl/Cmd+单击仍进入多目标定义选择。单目标沿用原生链接。

本轮涉及扩展客户端，需重启独立 Extension Host 后验收。检查 JSON / JSON-JS、变量绑定的路径、模板开闭标签；新增或删除平台文件以及编辑注册路径后，下划线应更新，缺失路径不应装饰。服务重启或停止后不得残留旧范围。遵循编辑器已有 `editor.links` 设置，不新增 Mpx 配置项。

真实下划线前后截图待分配的串行 UI 时段采集；已有用户截图只保留本地，不作为当前客户端装饰已验收的证据。

下划线位置使用与 VS Code 原生链接一致的 `text-underline-position: under`。同一字体、字号和缩放下，对照 `./panel` 与单目标 `./panel.ios.mpx`：线条应位于 `p / g / y` 等下伸部下方，不压住字形；不使用固定像素偏移，不改变点击范围或行为。该视觉对照仍需真实 Extension Host 截图验收。

## 预热后的响应和候选刷新

打开 `refresh.mpx`，等待诊断完成。对 `status` 重复悬停和 Ctrl/Cmd+悬停，预期显示字符串类型和可跳转状态。

对 `refresh-panel` 标签及 JSON 路径分别查看定义，初始都应只定位到普通版本。将 `refresh-targets/refresh-panel.mpx` 复制为同目录的 `refresh-panel.ios.mpx`，两个位置均应出现普通和 iOS 定义。删除该临时文件后，两处应恢复为一个定义。目标目录在本场景的 `tsconfig.json` include 范围外。整个过程保持 `refresh.mpx` 打开且无需编辑或重启服务器。
