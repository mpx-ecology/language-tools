# JavaScript grammar fixture

`JavaScript.tmLanguage.json` is the JavaScript grammar shipped by VS Code 1.144.0, derived from [Microsoft TypeScript-TmLanguage at 48f6086](https://github.com/microsoft/TypeScript-TmLanguage/tree/48f608692aa6d6ad7bd65b478187906c798234a8). Its JSON is formatted for this repository; grammar rules are unchanged. The upstream MIT license is included in `LICENSE`.

This fixed fixture makes condition highlighting regressions independent of installed editors and exercises real JavaScript expression scopes, string boundaries and encoded token types. The other embedded host grammars use the existing small minimap fixtures.
