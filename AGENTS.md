# Mpx Language Tools Repository Guide

## Project map

- This is a pnpm monorepo for the Mpx VS Code language tooling. Use the Node and pnpm versions declared in `package.json`.
- The main dependency flow is `language-shared -> language-core -> typescript-plugin/language-service -> language-server -> vscode`.
- `packages/language-core` owns Mpx SFC parsing, virtual TypeScript generation, source mappings, template type inference, and generated global types.
- `packages/typescript-plugin` serves TypeScript-backed component metadata and requests.
- `packages/language-service` and `packages/language-server` expose editor features over Volar/LSP.
- `vscode` is the extension client and bundle entry point.
- `inspect-extension` is the mutable manual integration workspace opened by the F5 Extension Host. It is not a unit-test fixture directory.

## Commands

- Install dependencies with `pnpm install`.
- Build all TypeScript projects with `pnpm build`.
- Run the complete test suite with `pnpm test`.
- Run a focused test with `pnpm exec vitest run <spec-file>`.
- Run repository linting with `pnpm lint`.
- Do not edit generated `out`, `dist`, bundled extension JavaScript, or generated global-type files under `node_modules` directly.

## Regression workflow

- For editor-visible bugs, add both layers when practical:
  1. A deterministic automated fixture and assertion under the owning package's `__tests__` directory.
  2. A self-contained manual scenario under the matching `inspect-extension` feature directory for F5 validation.
- Keep automated tests independent from generated output and from the mutable `inspect-extension` workspace.
- Mark intentional errors in manual `.mpx` scenarios with comments describing the expected diagnostic, hover, completion, navigation, or semantic-token behavior. Do not remove intentional errors merely to make the inspection workspace clean.
- For language-core changes, run the focused spec first, then `pnpm build`, `pnpm test`, and `pnpm lint`.

## F5 debugging

- The default `VSCode Extension` launch configuration runs the root `watch` task, loads `vscode` as the development extension, disables the installed `mpxjs.mpx-official`, and opens `inspect-extension` in a new Extension Host.
- After changing server or language-core behavior, wait for the watch build and run `Mpx: Restart Server` in the Extension Host. Restart the Extension Host when extension-client activation or bundling behavior changes.
- Validate the relevant manual scenario in `inspect-extension` for diagnostics, hover types, completions, definitions/references, and semantic highlighting as applicable.
- Keep the language-server debug port in `.vscode/launch.json` synchronized with the port passed from `vscode/src/languageClient.ts`.

## Parallel session coordination

- Worktrees, VS Code profiles, and separate windows isolate files or application data, not the desktop focus. Serialize Computer Use against the same native app; acquire one shared host-wide UI lock before launching/reloading GUI hosts, switching focus, typing/clicking, taking system screenshots, or using native upload dialogs. Release it after the continuous UI operation, including on failure. Build and network waits belong outside the lock.
- Use an atomic lock acquisition with an owner recorded. Only the owner may release it; a busy session continues independent code/tests instead of stealing the lock or polling rapidly. Do not reclaim a lock solely because it is old: first verify the owner has stopped and no UI action is running. This is a cooperative protocol, not automatic product-level isolation.
- Give each session its own inspect scenario copies, VS Code user-data/extensions directories, service/debug ports, screenshots, and temporary paths. Restart or stop only processes created by that session. Background provider tests can run in parallel only when their setup and requests do not take focus or change shared application state.
- Browser-extension tab APIs may run in parallel in dedicated task-owned tabs. Do not navigate or edit another session's tab. Native browser UI and file dialogs still require the desktop lock. Separate tabs do not isolate shared Issue/PR data: re-read the latest body before merging evidence, preserve others' changes, and keep the shared feedback tracker under one coordinating session.
- If another session may have changed focus or state during an inspection, discard that affected result and repeat the check while holding the lock. Keep the [official same-app Computer Use guidance](https://learn.chatgpt.com/use-cases/use-your-computer-with-codex#avoid-parallel-runs-in-the-same-app) in mind when scheduling UI work.

## Virtual-code changes

- Treat `verification`, `completion`, `semantic`, and `navigation` mapping capabilities independently. A duplicated source mapping can cause duplicate diagnostics, conflicting hover/semantic information, or incorrect navigation even when generated TypeScript compiles.
- Preserve raw option metadata and source navigation when changing component code generation. Avoid fixing inference by broadly replacing types with `any` or by disabling unrelated mapping capabilities.
- Changes to generated component/template context should normally test diagnostics and hover information; add mapping or definition assertions when the bug involves semantic tokens or navigation.

## Change hygiene

- Preserve unrelated user changes in the working tree and keep edits scoped to the requested behavior.
- Do not commit, push, publish, or update changelogs unless the user explicitly asks for that action.

## Bug fix delivery workflow

- For each requested bug fix, first find the matching GitHub issue or create one before implementation. Keep the issue concise: describe the problem, the necessary reproduction steps, and the expected behavior.
- Follow the [Issue and PR format schema](CONTRIBUTING.md#issue-与-pr-格式-schema) and the matching templates in `.github/`. The schema applies to both GitHub UI submissions and bodies submitted through CLI/API tools.
- Reuse labels applied to similar historical issues.
- By default, include a problem-reproduction screenshot in each bug issue, captured in the actual F5 VS Code Extension Host with a minimal `inspect-extension` scenario. Upload captures as GitHub attachments rather than committing image files.
- By default, include before/after F5 `inspect-extension` screenshots in each bug-fix PR, using the same scenario, editor settings, theme, and comparable views to show the relevant diagnostics or editor behavior. Capture the baseline before implementation, or reproduce it later in an isolated baseline checkout.
- Screenshots may be omitted only when the change cannot or does not need to be validated through F5. State the concrete reason and applicable alternative evidence in the issue's reproduction-screenshot section and the PR's comparison section. Code, test logs, and provider assertions alone do not exempt an editor-visible fix; pending captures must remain marked as pending.
- Keep internal information out of published captures and keep user-provided screenshots containing internal information local.
- Create a new `codex/` branch from the target base branch for the fix. Keep unrelated local commits and user changes out of the branch.
- Implement and validate the fix, then commit, push the branch, and open a focused pull request. Link the issue in the PR body with `Closes #<issue-number>` or an equivalent closing keyword.
- The user's standing instruction authorizes this issue → branch → fix → PR workflow for requested bug fixes. Merging, publishing a release, and updating changelogs still require an explicit request.

## Issue and PR format checks

- Before creating or updating an issue or PR, check its title, required headings, heading order, and required content against the schema. Preserve existing discussion and evidence when restructuring a body.
- Use concise Markdown prose, numbered reproduction steps, and a validation results table. Keep implementation detail in the PR; the issue should explain the observable problem and expected behavior.
- Fill every required section. Remove unused optional sections and template hints; do not submit empty headings or placeholder text. Use `未知（原因）` for unavailable facts and `不适用（原因）` for inapplicable fields.
- Report validation as `通过`, `失败`, or `未执行（原因）`, with concrete commands or manual steps and evidence. Never present planned checks as completed checks.
