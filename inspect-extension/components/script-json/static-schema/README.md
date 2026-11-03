# 静态 JSON Schema（U07 / T12）

使用本 worktree 的 Extension Host，打开 `valid.mpx` 与 `errors.mpx`，按中文注释验收。

- ✅ `component` 原有说明、true 补全、顶层页面字段提示继续有效。
- ✅ `componentGenerics` 字段及 `default` 字段补全、hover 说明可用。
- ✅ 合法示例无 JSON 诊断，注释、尾逗号、扩展字段保留。
- ✅ `usingComponents` 路径补全、链接导航继续有效。
- ❌ 错误示例保留故意错误，检查数字值类型、缺失路径、页面枚举诊断范围。

范围仅为 `<script type="application/json">` 静态配置。动态 JSON JS 配置类型语义由 T13 / #138 单独处理。`componentGenerics.default` 本次补字段类型提示，不新增路径解析或导航。

约束依据：[Mpx 组件 JSON 配置](https://mpxjs.cn/guide/basic/component.html#componentgenerics)、Mpx 编译器 `packages/webpack-plugin/lib/json-compiler/index.js` 的 `processComponents` / `processGenerics`。不添加未知字段禁用、泛型 default 必填、文件角色或跨平台枚举限制；保留编译器接受的布尔声明及无 default 对象。
