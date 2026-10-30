# Vue / Mpx 宏共存检查

对应问题：[Vue / Mpx 宏共存 #119](https://github.com/mpx-ecology/language-tools/issues/119)、[显式绑定、导航和重命名回归 #122](https://github.com/mpx-ecology/language-tools/issues/122)。

目标：同一 TypeScript project 中，Mpx 的 `defineProps` / `withDefaults` 使用 Mpx 的类型规则，Vue 组件继续使用 Vue 规则。

## 在 VS Code 中对照修复前后

本目录的独立 `tsconfig.json` 把 `vue-first.ts` 列在文件列表首位，该文件仅通过类型导入加载 Vue 的声明，让本项目稳定进入“Vue 声明先于 Mpx”的情况。打开文件的先后不是可靠的复现开关。

1. 在仓库根目录打开 VS Code，选择默认 `VSCode Extension` 配置后按 F5。默认 watch 会编译 TS 并重新打包开发扩展，等待终端构建完成。
2. 在新开的 Extension Development Host 中确认 Vue (Official) 已启用；Mpx 使用本仓库的开发扩展。执行 `TypeScript: Select TypeScript Version`，选择工作区版本（本轮验证为 6.0.3）。
3. 打开本目录 `vue-first.ts`，执行 `TypeScript: Go to Project Configuration`，应进入本目录的 `tsconfig.json`。再打开两份 `.mpx`，执行 `Mpx: Restart Server`。若项目仍使用旧缓存，执行 `Developer: Reload Window`。
4. 打开 Problems 面板（Cmd/Ctrl+Shift+M），按当前文件过滤，对照下表。将鼠标放到脚本里的 `props.title`、`props.profile` 上，检查 hover；同时观察模板内相同字段的诊断。

| 文件 / 位置                                                   | 临时还原修复后，应复现的问题                                                      | 应用修复后，应观察的结果                                                           |
| ------------------------------------------------------------- | --------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| `runtime-props.mpx` 的 `props.title.toUpperCase()` 等合法调用 | TS18048：`props.title / count / profile` 可能为 `undefined`；模板也有相应误报。   | 合法调用无误报，`title` 为 `string`，`count` 为 `number`，`profile` 为 `Profile`。 |
| `typed-defaults.mpx` 的 `profile: { name: 'mpx' }`            | TS2353：对象默认值被要求符合 Vue 的工厂函数类型；后续字段可能继续报 TS18048。     | 接受 Mpx 的对象默认值，默认值后的字段没有 `undefined`。                            |
| `runtime-props.mpx` 最后的 `props.count.toUpperCase()`        | 故意错误，仍应报错。                                                              | 仍报 TS2339；不能为了消除误报关闭类型检查。                                        |
| `typed-defaults.mpx` 最后的 `props.title = 'changed'`         | 故意错误，仍应报错。                                                              | 仍报 TS2540，props 仍只读。                                                        |
| `control.vue`                                                 | 合法 `required / default` 用法正常；只有故意的 `number.toUpperCase()` 报 TS2339。 | Vue 保持相同结果。                                                                 |

5. 切换修复代码后，等待原窗口的 watch 重新编译、打包，再在 Extension Host 执行 `Mpx: Restart Server`。`pnpm build` 只构建 TS 项目，不能代替扩展 bundle 的更新；通过默认 F5 watch 验证即可。
6. 修复启用后继续检查成员补全，以及 `.mpx` 的 `profile.name` 到 interface 字段的定义跳转。
7. 在 `runtime-props.mpx` 的 `defineProps` 和 `typed-defaults.mpx` 的 `withDefaults` 上执行 F12，应到真实的全局宏声明，不应跳到生成的局部声明或没有结果。Vue-first 项目的目标可以是 Vue 的全局声明，但 props 推断仍使用 Mpx 规则。在这些宏名上执行 F2，应拒绝仅修改调用处的重命名。
8. 打开 `explicit-type-imports.mpx` 和 `explicit-bindings.mpx`：除注释标记的 TS2339 外，不应有声明冲突、参数数量或推断错误。检查 `typeof` 名称及显式导入函数的 F12；显式导入函数仍允许 F2，并应包含源声明，不能把所有同名函数的导航或重命名一起关闭。

本目录故意预载入 Vue 类型，用于稳定检查共享 TS project 下的宏类型隔离。关闭 Vue 插件不会移除 `vue-first.ts` 引入的类型，所以不能把“禁用 Vue 插件后这里仍报错”判为复现失败。若要另查插件单独启用的普通场景，应使用未显式预载入 Vue 类型的项目。

## 不启动编辑器的最小对照

在仓库根目录运行：

```sh
pnpm_config_verify_deps_before_run=warn pnpm exec vitest run packages/language-core/__tests__/vueMacroCoexistence.spec.ts -t 'Vue before Mpx.*keeps valid Mpx props typed in (runtime-props|typed-defaults)[.]mpx$'
```

未应用修复时，这两个测试应因 TS18048 / TS2353 失败；应用修复后应全部通过。该命令只选择两个最小用例，避免把其他回归项的失败混入观察。`pnpm_config_verify_deps_before_run=warn` 用于本机依赖状态提示，避免 pnpm 自动触发重装，不会跳过 Vitest 检查。

自动化回归在 `packages/language-core/__tests__/vueMacroCoexistence.spec.ts`，使用独立 fixture 和实际安装的 Vue 2.7 声明，控制 Mpx-only / Mpx-first / Vue-first 三种声明加载顺序。它不依赖本目录，也不代替 Extension Host 的最终 UI 验收。
