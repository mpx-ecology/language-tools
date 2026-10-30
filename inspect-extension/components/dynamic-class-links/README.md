# Dynamic class navigation and completion

Regression scenario for T08 / [issue #126](https://github.com/mpx-ecology/language-tools/issues/126).

1. Launch `VSCode Extension` with F5, wait for watch to finish, then run
   **Mpx: Restart Server** in the Extension Host.
2. Open `index.mpx` and Cmd/Ctrl-click `is-solo`, `active`, `array-class`,
   `nested-class`, and `fallback-class` in the template. Each explicit key or
   literal should have one style selector target, without a second target back
   to the same template object key. Static classes continue to work.
3. Cmd/Ctrl-click `titleText`, `enabled`, and `dynamicClass`. They should retain
   their script definitions and typed hover information. Member completion on
   `titleText` should still suggest string methods.
4. Invoke completion between the quotes of the empty key, or after `is-` in the
   next example. Local style class names should be suggested.
5. The last template expression intentionally calls `titleText.toFixed()`.
   Keep its single type error; class navigation must not suppress it or add a
   duplicate diagnostic.

The supported `wx:class` forms are literal strings, explicit object keys, nested
arrays, and statically named branches of conditional / logical expressions.
Ordinary `class` values follow Mpx string semantics: only static text and
statically named string branches are collected, without object/array
normalization. Mixed text around a `wx:class` Mustache likewise produces a
string, so object keys inside that mixed text are not treated as class names.
Mustache string branches are collected only at whitespace or attribute-value
boundaries. Adjacent fragments such as `pre-{{ 'active' }}` or
`{{ 'active' }}-suffix` are not linked to the unrelated `.active` selector.
Runtime variables, computed dynamic keys, function results, and concatenated
class names are not evaluated. A shorthand key such as `{ enabled }` is both a
class name and a variable, so its two meaningful definition targets remain.
JavaScript string escapes are conservatively excluded from new class mappings;
ordinary literals following them must retain their correct source positions.
This scenario does not extend the existing CSS selector parser's Unicode or
escaped-selector support.
