# Vue / Mpx 宏共存检查

对应问题：[#119](https://github.com/mpx-ecology/language-tools/issues/119)、[#122](https://github.com/mpx-ecology/language-tools/issues/122)、[#125](https://github.com/mpx-ecology/language-tools/issues/125)、[Mpx 用例及编译验证 #132](https://github.com/mpx-ecology/language-tools/issues/132)。

所有 `.mpx` 场景使用单个有效的 `<script setup>`。默认 wx 模板仅使用原生属性访问和运算；字符串/数字方法的类型断言放在脚本里。`control.vue` 是 Vue 插件的独立对照文件，不按 Mpx 组件编译。

Mpx 编译器按保留名称识别 `defineProps` / `withDefaults`，局部同名函数不会将这些调用变成普通函数。`withDefaults` 只用于 TypeScript 类型式 `defineProps`；JavaScript 的默认值写在运行时 props 的 `value` 中。

`mpxProps` / `mpxDefaults` 在本项目的语言工具配置中登记为别名，但这不会生成运行时函数，也不会改变 Mpx 编译器。绑定场景均从 `local-macros.ts` 显式导入或赋值，调用的是实际存在的普通函数；没有未绑定的别名调用。F12 可进入 helper 源声明，F2 修改本地绑定及其引用。Mpx 原生宏和普通 helper 的行为分别验证。

## Extension Host 检查

1. 在仓库根目录打开 VS Code，使用默认 `VSCode Extension` 配置按 F5，等待 watch 完成编译和扩展打包。开发扩展使用本仓库的 `vscode`；已安装的同名 Mpx 扩展由启动配置禁用。
2. 确认 Vue (Official) 已启用，TypeScript 选择工作区版本。本目录 `tsconfig.json` 首先载入 `vue-first.ts`，稳定建立 Vue 声明先加载的场景，不能用打开文件的先后顺序代替。
3. 对 `vue-first.ts` 执行 `TypeScript: Go to Project Configuration`，应进入本目录的 `tsconfig.json`。修改服务端后执行 `Mpx: Restart Server`；若切换了扩展客户端或 bundle，则重启 Extension Host。
4. 在 Problems 中按当前文件过滤，逐项检查下表。故意的类型错误放在 `if (false)` 内，不会在执行编译产物时触发，但类型诊断必须保留。

| 文件                                               | 应检查的行为                                                                                                       | 唯一预期类型错误                  |
| -------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ | --------------------------------- |
| `runtime-props.mpx`                                | `props.title/count/profile` 为 string/number/Profile；模板 `title.length`、`profile.name` 无误报；对象字段补全正常 | TS2339：number 没有 `toUpperCase` |
| `typed-defaults.mpx`                               | 接受对象默认值，默认字段不含 undefined；`profile.name` 可跳转到 interface 字段                                     | TS2339：number 没有 `toUpperCase` |
| `explicit-type-imports.mpx`                        | `typeof` 使用显式类型导入的函数类型；没有声明冲突；类型查询名称能跳转到 helper                                     | TS2339：number 没有 `toUpperCase` |
| `explicit-bindings.mpx`                            | `mpxProps` 是已导入的实际函数；namespace `withDefaults.version` 为 number；导入别名可跳转和重命名                  | TS2339：string 没有 `missing`     |
| `hoisted-bindings.mpx` / `hoisted-bindings-js.mpx` | 块内 var 提升的 `mpxProps` / `mpxDefaults` 保留 helper 签名；`localCount` 为 number；无宏参数误报                  | TS2339：number 没有 `toUpperCase` |
| `control.vue`                                      | Vue 的 required/default 规则不变                                                                                   | TS2339：number 没有 `toUpperCase` |

5. 在真实宏 `defineProps` / `withDefaults` 上按 F12，应到真实的全局声明；Vue-first 项目的目标可以是 Vue 声明，但 Mpx props 推断必须保持 Mpx 规则。F2 应拒绝只修改宏调用处的重命名。
6. 在 `runtime-props.mpx` 的 `define|Props`、`typed-defaults.mpx` 的 `with|Defaults` 上按 Ctrl+Space（竖线表示光标，不要输入），应出现当前词法作用域中的 `defineExpose`、`defineOptions` 等名称及补全详情，不能只剩辅助对象成员。检查 `withDefaults(` 第一个参数起始处的参数提示。
7. 在提升绑定场景中，从 `mpxProps` / `mpxDefaults` 的声明及调用处分别执行 F12/F2，重命名必须包含声明和调用。它们是有真实绑定的 helper，不能套用原生编译宏禁止局部重命名的规则。

显式载入 Vue 类型后，禁用 Vue 插件不会移除这些声明，不能用禁用插件后的结果判断本目录是否仍在复现 Vue-first 环境。

## 自动化验证

在仓库根目录执行：

```sh
pnpm exec vitest run packages/language-core/__tests__/vueMacroCoexistence.spec.ts packages/language-core/__tests__/scriptSetupBindings.spec.ts packages/language-core/__tests__/mpxCompilation.spec.ts
```

自动化 fixture 独立保存在 owning package 的 `__tests__/fixtures`，不读取本手工目录。每个正向 fixture 都必须登记编译产物的 props 默认值和 setup 返回结果，并与语言服务推断的组件 props 名称一致。

默认键使用 Mpx 实际的 `withDefaults` 类型声明；只读赋值的回归断言保留在运行时 props 反例 `invalid-props.mpx` 中。普通 TS 文件 `ambient-control.ts` 只检查环境声明的类型推断，其探针不会执行。

`mpxCompilation.spec.ts` 使用锁定的 `@mpxjs/webpack-plugin@2.11.1`，运行真实 SFC 选择、script-setup 编译、模板编译和原生绑定表达式检查，再转译并执行生成的 JavaScript。测试捕获 `createComponent` 注册以检查属性和执行 setup，不模拟完整小程序宿主。编译器反例明确验证运行时 props 配合 withDefaults、保留宏名调用、未绑定别名及模板方法调用的错误边界。

若需要与相邻源码库交叉验证，可显式指定其 package.json：

```sh
MPX_TEST_COMPILER_PACKAGE=../mpx-core/packages/webpack-plugin/package.json pnpm exec vitest run packages/language-core/__tests__/mpxCompilation.spec.ts
```

默认测试不依赖相邻仓库；编译验证不替代 Extension Host 或真机验证。
