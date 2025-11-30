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

## 插件版本规范

### 正式/预发布 版本号规范

VS Code 插件版本号规范目前仅遵循 `major.minor.patch`，未来可能会支持完整的 [Semver] 规范。根据 VS Code [官方建议][参考]，Mpx 插件的版本号应遵循以下规则：

- **正式版本（Release）**：`major.EVEN_NUMBER.patch`（`minor` 偶数版本），例如：`1.2.x`、`1.16.0`。

- **预发布版本（Pre-Release）**：`major.ODD_NUMBER.patch`（`minor` 奇数版本），例如：`1.3.x`、`1.15.0`。

> [!NOTE]
>
> 如果存在比预发布版本更高的正式版本，用户也可以自动更新到正式版本。

### 版本更新

本仓库使用 lerna 进行版本管理，请使用 lerna 进行版本更新。

> [!NOTE]
>
> 实际我们安装使用的是 [lerna-lite](https://github.com/lerna-lite/lerna-lite) 而非 lerna，因为 lerna-lite 支持 pnpm `catalog:` 协议，而 lerna 不支持。

```sh
# 1. 更新补丁版本直接执行如下命令
pnpm version:patch

# 2. 更新大版本或小版本时，使用以下命令
pnpm build
npx lerna version [x.x.0|major|minor]

# 3. 推送 tag 触发插件发版的 GitHub Actions CI
git push origin main
git push origin --tags

# 4. 同步发布 npm 包（注意需要 @mpxjs npm scope 管理员权限）
pnpm publish:npm
```

## 插件发版 CI/CD

插件自动打包发版 workflow 目前已经集成到 [GitHub Actions](./.github/workflows/publish-extension.yml) 中，并且支持根据上面的[版本号规范](#正式预发布-版本号规范)来自动发布正式/预发布版本。

- **触发条件**：当向仓库推送版本标签 tag 时触发（请参照上面的[插件版本规范](#插件版本规范)更新并推送版本）。

<!-- Reference Links -->

[Semver]: https://semver.org/lang/zh-CN/
[参考]: https://code.visualstudio.com/api/working-with-extensions/publishing-extension#prerelease-extensions
