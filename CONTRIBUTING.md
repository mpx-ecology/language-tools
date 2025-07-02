# Contributing

## 开发指南

### 环境要求

- node 版本：[package.json](./package.json) `engines.node`
- pnpm 版本：[package.json](./package.json) `packageManager`

建议通过 node 自带的 corepack 来自动安装仓库要求的 pnpm：
```sh
corepack enable
```

### 本地启动

**安装依赖：**

```sh
pnpm i
```

**启动插件调试窗口：**

通过 `F5` 启动插件调试窗口（宿主扩展窗口）。

## 插件发版规范

VS Code 插件版本号规范目前仅遵循 `major.minor.patch`，未来也许会支持完整的 [Semver] 规范。根据 VS Code [官方建议][参考]，Mpx 插件的版本号应遵循以下规则：

- 正式版本（Release）：`major.EVEN_NUMBER.patch`（`minor` 偶数版本），例如：`1.2.x`。

- 预发布版本（Pre-Release）：`major.ODD_NUMBER.patch`（`minor` 奇数版本），例如：`1.3.x`。

> [!NOTE]
>
> 如果存在比预发布版本更高的正式版本，用户也可以自动更新到正式版本。

<!-- Reference Links -->

[Semver]: https://semver.org/lang/zh-CN/
[参考]: https://code.visualstudio.com/api/working-with-extensions/publishing-extension#prerelease-extensions
