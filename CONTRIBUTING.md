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

## Issue 与 PR 格式 schema

创建或更新 Bug Issue、PR 时，正文必须按下面的顺序保留必填二级标题，并填写对应内容。通过 GitHub 页面、CLI 或 API 提交时遵循同一结构；提交前移除模板提示和未使用的可选章节。

内容以中文或英文写清楚即可，标题结构保持一致。未知信息写 `未知（原因）`，不适用的字段写 `不适用（原因）`，不要留空或保留占位文本。本 schema 是提交规范和模板约束，目前未配置 CI 自动校验。

### Bug Issue schema

标题格式：`bug(<scope>): <可观察到的问题>`。`scope` 使用主要受影响的包或模块，例如 `language-core`、`language-service`、`vscode`。

| 顺序 | 二级标题   | 约束                                                                                                                     |
| ---- | ---------- | ------------------------------------------------------------------------------------------------------------------------ |
| 1    | `问题描述` | 必填。描述触发条件、实际行为和影响范围；诊断问题附诊断文本或编号。                                                       |
| 2    | `复现步骤` | 必填。提供最小复现代码或仓库链接，并用有序列表写明操作及观察结果。Mpx 示例须符合 Mpx 语法。                              |
| 3    | `预期行为` | 必填。说明同一操作下应该出现的结果，使修复可以验收。                                                                     |
| 4    | `环境信息` | 必填。记录实际安装的 `@mpxjs/core`、Mpx (Official)、TypeScript、VS Code 版本及目标平台；其他相关依赖或系统信息按需补充。 |
| 5    | `补充信息` | 可选。放截图、日志、关联问题或临时绕过方式；截图和代码中不得包含内部信息。                                               |

使用 [Bug Issue 模板](.github/ISSUE_TEMPLATE/bug_report.md)。复现可提供基于 `@mpxjs/cli` 的最小项目，或仓库内可独立验证的 `inspect-extension` 场景路径。未知根因不妨碍提交 Issue，不要把推测写成已确认事实。

### PR schema

标题格式：`<type>(<scope>): <变更后的行为或结果>`。`type` 使用 `fix`、`feat`、`docs`、`refactor`、`test`、`perf`、`build`、`ci`、`chore` 或 `revert`；跨仓库配置和规范变更可使用 `repo` scope。

| 顺序 | 二级标题       | 约束                                                                                                          |
| ---- | -------------- | ------------------------------------------------------------------------------------------------------------- |
| 1    | `变更说明`     | 必填。先说明解决的问题和变更后的行为，再简述关键改动及原因。复杂修复可补根因，不展开工作过程。                |
| 2    | `关联 Issue`   | 必填。Bug 修复使用 `Closes #<编号>`；多个 Issue 分别列出。非修复变更可写 `Refs #<编号>` 或 `不适用（原因）`。 |
| 3    | `验证结果`     | 必填。用表格记录具体命令或手动操作、结果及证据。结果使用 `通过`、`失败` 或 `未执行（原因）`，失败需说明影响。 |
| 4    | `风险与兼容性` | 必填。说明受影响的行为、兼容性变化和已知限制；未发现风险时写明评估范围，不使用没有依据的“无风险”。            |
| 5    | `效果对比`     | 可选。提供同一场景的修复前后表现或截图，标明预期变化；代码和验证记录已足够说明时可省略。                      |

使用 [PR 模板](.github/pull_request_template.md)。验证证据可引用测试文件、手动场景路径、关键输出或截图。涉及编辑器行为时按需记录 F5 验证；没有执行的检查必须写明原因，不能用计划执行代替已完成的结果。纯文档变更只需记录适用的格式和链接检查。

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
npx lerna version [x.x.0|major|minor] --yes --force-publish

# 3. 推送 tag 触发插件发版的 GitHub Actions CI
git push origin main
git push origin --tags

# 4. 同步发布 npm 包（注意需要 @mpxjs npm scope 管理员权限）
pnpm npm:publish
```

## 插件发版 CI/CD

插件自动打包发版 workflow 目前已经集成到 [GitHub Actions](./.github/workflows/publish-extension.yml) 中，并且支持根据上面的[版本号规范](#正式预发布-版本号规范)来自动发布正式/预发布版本。

- **触发条件**：当向仓库推送版本标签 tag 时触发（请参照上面的[插件版本规范](#插件版本规范)更新并推送版本）。

<!-- Reference Links -->

[Semver]: https://semver.org/lang/zh-CN/
[参考]: https://code.visualstudio.com/api/working-with-extensions/publishing-extension#prerelease-extensions
