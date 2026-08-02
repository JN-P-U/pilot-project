# AGENTS.md

## Scope

These instructions apply to `packages/browser`.

Before feature work, read:

- `README.md`
- `prompts/feature-context.md`

## Rules

- Keep `ui-test-evidence.html` and `ui-test-evidence-excel.js` usable without a build step.
- Do not add a framework, backend API, npm package, or bundler unless explicitly requested.
- Preserve the global `UITestEvidenceExcel` API unless the user requests a breaking change.
- Keep README payload examples aligned with implementation.
- Standalone browser cases use `imageBase64`; do not confuse this with the React package's `image`.
- Do not add heavy Excel libraries such as `exceljs` or `xlsx`.

## Validation

- Open the sample HTML and verify capture/download flow when practical.
- If API, payload, filename, sheet, or capture behavior changes, update `README.md`.
