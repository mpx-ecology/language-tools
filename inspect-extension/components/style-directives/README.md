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
- The surrounding comment remains a comment. Conditions retain comment highlighting; this change does not add condition-variable completion or promise a particular theme color.
- The quoted `/* @mpx-i */` remains a CSS string and does not offer directive completion. Ordinary stylesheet properties after `*/` keep their original scopes. Script and template comments do not receive style-directive scopes.
- Existing `MARK:` section headers in nearby comments retain `meta.section-header.mpx`.

The automated completion and tokenization fixtures live under `packages/language-service/__tests__` and `vscode/__tests__`, independently of this mutable manual workspace. F5 UI acceptance is a separate check from those automated tests.

The valid directive forms and multiline comments follow `mpx-core`'s `packages/webpack-plugin/lib/style-compiler/plugins/conditional-strip.js` and `lib/style-compiler/strip-conditional.js`; the latter also handles `//` directives before style preprocessing. `__mpx_mode__` is injected through the plugin's default `defs`. Full directive-looking text inside strings, ordinary prose, nested comment delimiters and incomplete syntax in automated tests are intentional lexical/editor negative cases, not claims that the Mpx compiler accepts those inputs.

## Visual acceptance — 2026-10-30

Passed in the actual F5 Extension Host using the normal `VSCode Extension` launch configuration and watch task, with the workspace's **Dark Modern** theme. CSS was checked in VS Code 1.144.0; the complete matrix was checked after restarting the host in Code Insiders 1.145.0.

- CSS, SCSS, Less, PostCSS and Stylus directive keywords use `keyword.control.directive.mpx` and render purple (`#C586C0`). Surrounding comment delimiters and conditions remain green (`#6A9955`). Multiline directives retain the same distinction.
- The quoted comment-looking text on line 35 remains `string.quoted.single.css`, orange (`#CE9178`), with no directive scope. Ordinary comments retain their comment scope and green color.
- The nearby `MARK:` keeps `meta.section-header.mpx` and its minimap header. Selectors and properties after closing comments keep normal stylesheet colors.
- The PostCSS block also passes without an installed `source.postcss` grammar: it falls back to the built-in CSS grammar. This default-editor case has a dedicated regression test.

Actual window screenshots were retained locally as review evidence, outside Git.
