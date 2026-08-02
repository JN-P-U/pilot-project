# AGENTS.md

## Scope

These instructions apply to `apps/ui-test` and its internal React package `apps/ui-test/test-evidence`.

Before feature work, read:

- `README.md`
- `package.json`
- `prompts/feature-context.md`

## Rules

- Keep browser-only behavior in client components, event handlers, or dynamic imports.
- Do not run browser APIs on the SSR path.
- Keep app imports consistent with the existing `@/app/...` pattern.
- Preserve the `@ui-test/react` public exports in `test-evidence/src/index.ts`.
- Do not add heavy Excel libraries such as `exceljs` or `xlsx` to the evidence generator.
- Keep workbook sheet names and default filename format stable unless explicitly requested.
- React package case images use `image` data URLs.

## Validation

- UI/build changes: `npm run build --workspace=ui-test`
- Flow changes: `npm run test:e2e --workspace=ui-test`
- XLSX structure changes: generate at least one XLSX and verify it opens when practical.
