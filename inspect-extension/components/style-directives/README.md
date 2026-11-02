# Style conditional directives (T01 / #127)

Open this worktree with VS Code, select **VSCode Extension**, then press **F5**. This change includes a TextMate grammar: restart the Extension Host after a watch build; restarting only the Mpx server does not reload grammar rules.

Open `cases.mpx` in the Extension Host. Its CSS, SCSS, Less, PostCSS and Stylus blocks are independent editor scenarios.

## Completion

Completion is scoped to standalone directive comments: only whitespace may precede the comment opener on its line. Comments after stylesheet statements are left unchanged. This also avoids editing comment-looking text in preprocessor interpolation strings.

1. On a new stylesheet line, type `@` or `@mpx-`, then invoke completion. Accepting `@mpx-if` or `@mpx-elif` should produce `/* @mpx-if () */` or `/* @mpx-elif () */`, with the cursor inside the parentheses. `else` and `endif` have no condition placeholder.
2. In an existing `/* @mpx-if (...) */`, delete the command to `/* @mpx-i` and invoke completion. Accepting `@mpx-if` should preserve the existing comment delimiters and condition. No second `/*`, `*/` or condition should appear.
3. In `/* @mpx-else */`, place the cursor in the command and invoke completion. Accepting a replacement should replace the whole command, including characters after the cursor.
4. Try `/* @mpx-el` to verify that only `elif` and `else` are offered. Repeat in a multiline block comment. A missing closing delimiter is supplied when creating a condition snippet in an unfinished block comment.
5. Inside the CSS `content` string in `cases.mpx`, invoke completion after `@mpx-i`: there should be no Mpx directive suggestions. The same applies to directive-like text after prose in a normal comment.
6. Stylus, SCSS and Less line comments also preserve their existing `//` prefix when completing `// @mpx-`. CSS and plain PostCSS only use block comments.

Incomplete prefixes are created during editing rather than committed as invalid stylesheet statements. Any temporary CSS diagnostics while entering a bare `@` should disappear after accepting the comment snippet.

## Highlighting

- `@mpx-if`, `@mpx-elif`, `@mpx-else` and `@mpx-endif` should have `keyword.control.directive.mpx` in **Developer: Inspect Editor Tokens and Scopes**, including the multiline CSS comment.
- The surrounding comment remains a comment. Conditions inside `@mpx-if` / `@mpx-elif` parentheses use JavaScript scopes for variables, strings, booleans, numbers and operators, following the theme. This does not add condition-variable completion.
- Check nested parentheses and the multiline condition. Temporarily remove a right parenthesis or a string quote before `*/`: the next stylesheet rule must retain CSS scopes. In Stylus, an unfinished `// @mpx-if (` must stop at the newline. Undo temporary edits after checking.
- The quoted `/* @mpx-i */` remains a CSS string and does not offer directive completion. Ordinary stylesheet properties after `*/` keep their original scopes. Script and template comments do not receive style-directive scopes.
- Existing `MARK:` section headers in nearby comments retain `meta.section-header.mpx`.

The automated completion and tokenization fixtures live under `packages/language-service/__tests__` and `vscode/__tests__`, independently of this mutable manual workspace. F5 UI acceptance is a separate check from those automated tests.

The valid directive forms and multiline comments follow `mpx-core`'s `packages/webpack-plugin/lib/style-compiler/plugins/conditional-strip.js` and `lib/style-compiler/strip-conditional.js`; the latter also handles `//` directives before style preprocessing. `__mpx_mode__` is injected through the plugin's default `defs`. Full directive-looking text inside strings, ordinary prose, nested comment delimiters and incomplete syntax in automated tests are intentional lexical/editor negative cases, not claims that the Mpx compiler accepts those inputs.

## Initial visual acceptance — 2026-10-30 (directive keywords only)

Passed in the actual F5 Extension Host using the normal `VSCode Extension` launch configuration and watch task, with the workspace's **Dark Modern** theme. CSS was checked in VS Code 1.144.0; the complete matrix was checked after restarting the host in Code Insiders 1.145.0.

- CSS, SCSS, Less, PostCSS and Stylus directive keywords use `keyword.control.directive.mpx` and render purple (`#C586C0`). Surrounding comment delimiters and conditions remain green (`#6A9955`). Multiline directives retain the same distinction.
- The quoted comment-looking text on line 35 remains `string.quoted.single.css`, orange (`#CE9178`), with no directive scope. Ordinary comments retain their comment scope and green color.
- The nearby `MARK:` keeps `meta.section-header.mpx` and its minimap header. Selectors and properties after closing comments keep normal stylesheet colors.
- The PostCSS block also passes without an installed `source.postcss` grammar: it falls back to the built-in CSS grammar. This default-editor case has a dedicated regression test.

The initial captures are attached to PR #130, outside Git. The initial condition-as-comment result is superseded by the acceptance below.

## Condition-expression acceptance — 2026-11-02

Passed after reloading this worktree's actual F5 Extension Host in Code Insiders 1.145.0 with Dark Modern. The same scenario was captured before and after reloading the grammar.

- CSS, SCSS, Less, PostCSS and Stylus condition variables carry `variable.other.readwrite.js` inside `meta.embedded.block.mpx-style-condition` and render blue (`#9CDCFE`). PostCSS still uses its CSS fallback without an extra syntax extension.
- In CSS, strings use `string.quoted.single.js` (`#CE9178`), booleans use `constant.language.boolean.true.js` (`#569CD6`), numbers use `constant.numeric.decimal.js` (`#B5CEA8`), and comparisons use `keyword.operator.comparison.js` (`#D4D4D4`). Parentheses retain the editor's bracket colors; delimiters remain CSS comments (`#6A9955`).
- The multiline condition keeps JavaScript variable scopes. The adjacent `MARK:` retains `meta.section-header.mpx` and the minimap title; ordinary properties retain CSS scopes. The quoted comment-looking `content` remains a CSS string.
- Automated regression coverage includes nested and quoted parentheses, escaped strings, regex parentheses, unfinished parentheses/quotes, line-comment newline boundaries, false directive/MARK text, and encoded token types and theme colors. A pinned upstream JavaScript grammar keeps these checks independent of installed editors. The four focused specs pass 101 tests; the full suite passes 120 tests, plus build and lint.
- The full manual Mpx scenario was parsed and conditionally compiled without errors for `wx`, `ali` and `web` using the local Mpx compiler. Screenshot evidence is attached to PR #130, outside Git.
