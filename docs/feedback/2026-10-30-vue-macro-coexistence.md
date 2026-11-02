# Vue / Mpx defineProps 共存问题排查与修复

对应 [U10 / T17](../plans/2026-10-30-language-tools-optimization.md)，日期：2026-10-30。已在 TypeScript 语言服务中复现并完成代码修复；Extension Host UI 验收待执行。对应 GitHub [issue #119](https://github.com/mpx-ecology/language-tools/issues/119)，实现见 [PR #120](https://github.com/mpx-ecology/language-tools/pull/120)，尚未合并。

## 已确认的根因

`@mpxjs/core` 和 Vue 2.7 的类型声明都在 `declare global` 中定义 `defineProps`、`withDefaults`，但两边的 props / 默认值语义不同。Mpx 生成的 setup 虚拟代码此前直接调用全局宏，没有建立文件内的 Mpx 类型绑定。

同一 TS program 先载入 Vue 声明时，这两个名字会绑定到 Vue 的签名；先载入 Mpx 声明时则绑定到 Mpx。声明文件的重复声明诊断可被 `skipLibCheck` 等机制隐藏，但错误签名仍参与 `.mpx` 的类型推断。实验中用 checker 检查了符号的实际声明来源，并控制加载顺序复现了差异。

因此，当前已确认的是**同名全局宏与文件内类型绑定缺失**，不是必须同时发生“两插件重复修改 tsserver”才能触发的故障。只加载两套真实声明、不加载编辑器插件，也能复现。Vue 2.7 的全局声明可对照[上游源码](https://github.com/vuejs/vue/blob/v2.7.16/types/v3-setup-helpers.d.ts)；本地 Mpx 声明位于已安装包的 `@types/index.d.ts`。

## 最小复现

本机使用 Node `24.11.0`、TypeScript `6.0.3`、`@mpxjs/core` `2.11.0`、Vue `2.7.16`。使用仓库真实 Mpx / Volar / TypeScript 语言服务，以及实际安装的框架声明；不使用模拟的宏签名。

案例一：Mpx 运行时 props 的 `value`。

```ts
const props = defineProps({
  title: { type: String, value: 'hello' },
})
props.title.toUpperCase()
```

Mpx 类型下 `title` 为 `string`。当 Vue 声明优先时，Vue 不将 `value` 当成默认值，因此脚本和模板出现 TS18048（可能为 `undefined`）。

案例二：Mpx 的对象默认值。

```ts
const props = withDefaults(defineProps<{ profile?: { name: string } }>(), {
  profile: { name: 'mpx' },
})
props.profile.name.toUpperCase()
```

Mpx 接受该对象默认值。Vue 的签名要求对应对象默认值使用工厂函数，因而出现 TS2353，并连带丢失默认值消除 `undefined` 的推断。

修复前的首轮回归：6 项测试中 Mpx-only 与 Mpx-first 的 4 项通过，Vue-first 的 2 项失败，准确对应以上两类误报。

| 声明加载顺序 | 修复前                     | 修复后 |
| ------------ | -------------------------- | ------ |
| 只有 Mpx     | 两组合法代码通过           | 通过   |
| Mpx → Vue    | 两组合法代码通过           | 通过   |
| Vue → Mpx    | TS18048；对象默认值 TS2353 | 通过   |

## 修复方式与范围

- 在[全局类型生成](https://github.com/mpx-ecology/language-tools/blob/81edf8f35933d8d1fb6cd78222a4002e771d1c92/packages/language-core/src/codegen/globalTypes/defineComponentTypes.ts)中定义独立命名的 Mpx 宏类型，沿用 Mpx 的属性类型转换和默认值约束，不增加新的同名全局宏变量。
- 在[setup 虚拟代码生成](https://github.com/mpx-ecology/language-tools/blob/81edf8f35933d8d1fb6cd78222a4002e771d1c92/packages/language-core/src/codegen/script/scriptSetup.ts)中创建文件内的 `defineProps` / `withDefaults` 类型绑定，覆盖配置中的宏别名。JS 使用 JSDoc 形式，TS 使用类型断言；两者都只存在于 IDE 虚拟代码。
- 显式 import 或用户已有的局部绑定保留原类型；没有修改业务源码、运行时编译结果或 Vue 的声明，也没有修改 tsserver host 装饰与 VS Code 客户端补丁。
- 保留错误类型诊断、props readonly、hover、成员补全和字段源定义。新增 helper 使用 `__VLS_Mpx*` 命名，避免与 Vue helper 撞名，并沿用现有内部补全过滤规则。

这次没有统一迁移其他全局 helper，也没有扩大到未复现的其他宏冲突。普通 `.ts` 文件中的原有 ambient 类型绑定保持原样；仅隔离 Mpx SFC 的宏语义。

## 验证记录

[自动化回归](https://github.com/mpx-ecology/language-tools/blob/81edf8f35933d8d1fb6cd78222a4002e771d1c92/packages/language-core/__tests__/vueMacroCoexistence.spec.ts)覆盖三种声明顺序，共 33 项：运行时 props、泛型及对象默认值、JS、解构、双 script、配置别名、显式导入；还检查 hover、成员补全、源定义、只读 / 类型错误和普通 TS 模块不受影响。

额外执行了本机语言核心组合实验：从已安装的 Vue (Official) `3.3.13` 加载其真实 `createVueLanguagePlugin`，与当前构建的 Mpx language plugin 放入同一个 Volar / TS language service，使用合成 `.vue` 控制组件及两份独立 `.mpx` fixture。

| 插件顺序  | 文件顺序  | 恢复原有 ambient 绑定的对照 | 启用文件内 Mpx 绑定 |
| --------- | --------- | --------------------------- | ------------------- |
| Mpx → Vue | Mpx → Vue | Mpx 通过                    | Mpx 通过            |
| Mpx → Vue | Vue → Mpx | Mpx 出现 TS18048 / TS2353   | Mpx 通过            |
| Vue → Mpx | Mpx → Vue | Mpx 通过                    | Mpx 通过            |
| Vue → Mpx | Vue → Mpx | Mpx 出现 TS18048 / TS2353   | Mpx 通过            |

对照实验仅在内存中将新生成的局部宏绑定置为空白，保持源码映射 offset；不改生产代码和磁盘生成文件。全部组合中，Vue 控制组件的故意 `number.toUpperCase()` 仍只报预期 TS2339。结果进一步说明：本次问题由 program 内声明来源的先后触发，不能简单等同于插件注册顺序。

该组合实验使用真实 Vue 语言核心，但没有启动 VS Code Extension Host，不代表已验证两个完整扩展的激活与 UI。它是额外集成检查；正式回归测试不依赖本机扩展路径或生成的 `out` 文件。

最终检查结果：focused spec 33 项通过；`pnpm build` 通过；`pnpm test` 共 5 个测试文件、67 项通过；`pnpm lint` 通过；文档及 TS 格式检查通过。当前 pnpm 提示已有依赖状态与 lockfile 不完全一致，执行命令时设置 `pnpm_config_verify_deps_before_run=warn`，以运行现有工具而不自动触发重装；没有跳过实际 build、test 或 lint，也没有修改依赖与 lockfile。

F5 场景及步骤见 [inspect-extension/components/vue-coexistence](https://github.com/mpx-ecology/language-tools/blob/81edf8f35933d8d1fb6cd78222a4002e771d1c92/inspect-extension/components/vue-coexistence/README.md)，保留了预期诊断的故意错误。用户实际插件版本 / TS SDK 尚未提供；其他版本、Vue 3 项目或剩余异常需要用相同最小用例再验证，不能据本次结论认定所有共存问题均已解决。
