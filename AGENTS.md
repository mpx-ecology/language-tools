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

## Virtual-code changes

- Treat `verification`, `completion`, `semantic`, and `navigation` mapping capabilities independently. A duplicated source mapping can cause duplicate diagnostics, conflicting hover/semantic information, or incorrect navigation even when generated TypeScript compiles.
- Preserve raw option metadata and source navigation when changing component code generation. Avoid fixing inference by broadly replacing types with `any` or by disabling unrelated mapping capabilities.
- Changes to generated component/template context should normally test diagnostics and hover information; add mapping or definition assertions when the bug involves semantic tokens or navigation.

## Change hygiene

- Preserve unrelated user changes in the working tree and keep edits scoped to the requested behavior.
- Do not commit, push, publish, or update changelogs unless the user explicitly asks for that action.
