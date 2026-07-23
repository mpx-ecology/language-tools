# Tests

Run all tests once with `pnpm test`, or keep Vitest running with
`pnpm test:watch`.

The test suite has three layers:

- `language-core` fixtures create the real Mpx/Volar/TypeScript language
  service and assert generated code, diagnostics, hover information, and
  definitions.
- `language-service` tests isolate request concurrency and mock only the HTML
  service and template lookup boundary.
- `inspect-extension` remains the manual integration project for validating
  the final editor UI and extension packaging.

Feature fixtures live under `fixtures/`. Keep them small and local to the
behavior under test; do not make unit tests depend on generated `out` files or
the mutable `inspect-extension` project.
