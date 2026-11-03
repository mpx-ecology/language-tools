# T14 / U08 标签编辑验收

本项复核未发现自动闭合或标签联动的运行时缺口，不修改默认配置。自动化位于 `packages/language-service/__tests__/templateTagEditing.spec.ts`，使用独立 fixtures，不依赖本目录。

先按仓库 F5 配置启动本分支 Extension Host；并行验收时使用自己的 `--user-data-dir` 和 `--extensions-dir`。确认文件语言为 Mpx，开发扩展已激活，watch 构建完成。仅在自己的验收窗口配置：

```json
{
  "html.autoClosingTags": true,
  "editor.linkedEditing": true
}
```

这两项分别控制不同功能。复核的 VS Code Insiders 默认值为 `html.autoClosingTags=true`、`editor.linkedEditing=false`；用户与工作区配置可覆盖它们。可在设置面板搜索这两项，检查用户、工作区及语言覆盖配置。未开启联动不代表 provider 缺失，也不能据此推断原反馈环境的设置。

## 自动闭合

`▏` 表示光标，不要输入这个字符。以下操作在 `editing.mpx` 的 template 内逐项临时替换测试，完成后撤销恢复半成品场景：

| 输入前                   | 操作            | 预期                                               |
| ------------------------ | --------------- | -------------------------------------------------- |
| `<view▏`                 | 输入 `>`        | ✅ `<view>光标</view>`                             |
| `<view><my-card▏</view>` | 输入 `>`        | ✅ 只补 `</my-card>`                               |
| `<view><text></text><▏`  | 输入 `/`        | ✅ 补为 `</view>`                                  |
| `<my-card /▏`            | 输入 `>`        | ✅ 保持 `<my-card />`，❌ 不补闭标签               |
| `<view▏</view>`          | 输入 `>`        | ✅ 只有已有的一份 `</view>`                        |
| `<input▏`                | 输入 `>`        | ✅ HTML provider 视为 void 标签，不生成 `</input>` |
| `<view title="▏" />`     | 输入 `>` 或 `/` | ❌ 不插入标签文本                                  |

将 `html.autoClosingTags` 设为 false，重复 `>` 和 `/` 两种操作，✅ 仅保留手工输入的字符。重新开启后恢复自动操作。`/` 这里指 `</` 的闭标签补全；输入 `<my-card /` 时不应自动改写为配对标签。

## 标签联动与 F2

打开 `pairs.mpx`：

1. `editor.linkedEditing=true` 时，在内层 `view`、`my-card`、`customOutputComp` 名称中输入字符；✅ 只同步匹配的开闭标签。从闭标签编辑也应相同；❌ 不改父标签、兄弟标签、属性值或 JSON 注册名。
2. 关闭 `editor.linkedEditing`，重复输入；✅ 只改当前标签。撤销后重新开启。
3. F2 是显式 rename 请求，和自动联动分开验收。本次实际请求在已注册的 `my-card` 上只返回当前一对标签的两处编辑，未改同名兄弟标签或 JSON 注册名；关闭联动后也可使用。跨文件组件符号重命名不能据此宣称已支持，也不作为本项补实现的范围。

✅ 正例、❌ 故意错误或禁止操作以注释说明为准。`editing.mpx` 故意不完整；`pairs.mpx` 与 `child.mpx` 为完整 Mpx 场景，组件注册使用 `script type="application/json"`。

## 验证记录

2026-11-03，在本项独立 worktree 构建的 Mpx Official 1.24.3、TypeScript 6.0.3、VS Code Insiders 1.145.0-insider 中，使用独立用户数据 / 扩展目录和真实 Extension Host 编辑命令验证：`>`、`</`、嵌套自定义标签、自闭合、已有闭标签不重复插入、关闭自动闭合、开启 / 关闭标签联动均通过。服务层回归覆盖源码偏移、同名嵌套、连字符、自定义标签、半成品与无配对边界。

原反馈未提供设置或复现项目，因此无法确认其环境根因；本次结论限于上述基线和场景。
