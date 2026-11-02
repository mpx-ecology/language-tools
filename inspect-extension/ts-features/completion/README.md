# T10 / T11 模板补全验收

关联：[T10 #140](https://github.com/mpx-ecology/language-tools/issues/140)、[T11 #141](https://github.com/mpx-ecology/language-tools/issues/141)。

使用 F5 Extension Host；改动后等待 watch 构建并执行 `Mpx: Restart Mpx and TS servers`。所有场景独立放在本目录；自动化 fixtures 位于 language-core 的 `__tests__/fixtures/template-completion`，不依赖本目录。

- `variables.mpx`：在模板 `propTitle`、`exposedCount`、`hookTitle` 的第一个字符前、前缀中与末尾触发补全，应包含 props、defineExpose、onReactHooksExec 的字段与公开别名 `publicName`；不含未暴露的 `privateValue`。对 `profile.`、`hookProfile.` 检查成员候选；检查变量 hover 和 F12 回到各自源码声明。
- `typed-props.mpx`：检查类型式 props / withDefaults、Ref 暴露别名和 Hooks 返回值补全；`publicCount` 的 hover 为 number，`title` 为 string。
- `editing.mpx`：有意保留未完成的插值、属性表达式及空事件值，用于输入过程的补全检查。应有 propTitle、exposedTap、hookTitle 候选；不要为清理检查工作区而删除这些编辑态场景。
- `events.mpx`：将已有事件名改为 `bind:`、`catch`、`capture-bind:` 等前缀并触发补全。接受候选后只替换事件名，已有处理器保留。通用触摸事件支持 catch / capture；input 等非冒泡事件只提供普通 bind 两种拼写。
- `native-attributes.mpx`：检查 `enable-text-pass-through`、`decode`、`is-svg`、input / textarea 的 `keyboard-type`、movable-view 的 `workletChange` 候选和说明。图像属性不出现在 view 等无关标签上。保留 `image mode` 等已有属性值候选。

RN 能力以 Mpx master `f97ba5800a7249387f260b0ce50d1838367f054c` 的[组件文档](https://github.com/didi/mpx/blob/f97ba5800a7249387f260b0ce50d1838367f054c/docs-vitepress/guide/rn/component.md)、[模板事件](https://github.com/didi/mpx/blob/f97ba5800a7249387f260b0ce50d1838367f054c/docs-vitepress/guide/rn/template.md#events)和[混编文档](https://github.com/didi/mpx/blob/f97ba5800a7249387f260b0ce50d1838367f054c/docs-vitepress/guide/rn/hybrid-with-react-native.md)及对应实现为准。Mpx RN 扩展属性跨端使用时加 `@_ios|_android|_harmony` 隐式后缀，原生透传属性使用 `@ios|android|harmony`；本目录聚焦编辑能力。当前模板数据合并提供各平台候选，没有增加活动平台切换配置；直接注册的 React Native 组件类型接入仍归 T03。

## 验证记录

2026-11-02，Code Insiders `1.145.0-insider`、工作区 TypeScript `6.0.3`、仅加载本分支的开发扩展，在独立 Extension Host 中调用实际 VS Code providers 验收通过：

- 模板变量起点包含 props、expose 公开别名和 Hooks 字段；不含私有变量。`profile.` 只返回成员，不混入组件标签。
- Ref 的 hover 为 `(property) exposedCount: number`，F12 回到当前 `.mpx` 的源码声明。
- 类型式 props / withDefaults、Ref 别名和空事件值的候选正确。
- `bind:tap`、`catchtap`、`capture-bind:touchstart` 候选存在；接收 `is-svg` 候选保留 `@_ios|_android|_harmony`，并保留 hover 类型。
- 以上完整场景无错误诊断；未完成表达式另放在 `editing.mpx`。

三个专项 spec 共 59 项通过；完整场景使用发布包和相邻 Mpx 源码的真实编译器交叉验证。全量测试、构建和 lint 结果见关联修复 PR。
