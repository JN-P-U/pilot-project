# CLAUDE.md

Use this memory for work under `apps/auto-ui-test`.

@prompts/feature-context.md

## Rules

- Keep browser-only behavior in client components, event handlers, or dynamic imports.
- Do not run browser APIs on the SSR path.
- Keep app imports consistent with the existing `@/app/...` pattern.
- Preserve the `@auto-ui-test/react` public exports in `test-evidence/src/index.ts`.
- Do not add heavy Excel libraries such as `exceljs` or `xlsx` to the evidence generator.
- Keep workbook sheet names and default filename format stable unless explicitly requested.
- React package case images use `image` data URLs.

## Validation

- UI/build changes: `npm run build --workspace=auto-ui-test`
- XLSX structure changes: generate at least one XLSX and verify it opens when practical.
