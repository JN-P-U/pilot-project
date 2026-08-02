# AGENTS.md

## Scope

These instructions apply to `apps/file-transfer`.

Before feature work, read:

- `README.md`
- `prompts/feature-context.md`

## Rules

- Keep `file-transfer.html` usable by directly opening it in a browser.
- Do not add a build step, framework, backend API, or npm package unless explicitly requested.
- Do not read the entire input file with `readAsText()` or store all lines in memory.
- Preserve chunked `File.slice()`, `arrayBuffer()`, streaming `TextDecoder`, tail handling, bounded previews, and Blob-based output flushing.
- Keep Mapping Report CSV and Error List TXT semantics stable.
- Update `README.md` when mapping, validation, output naming, splitting, or limits change.

## Validation

- Test with a generated log from `gen-test-log.js` when practical.
- For browser behavior changes, open `file-transfer.html` and verify the relevant flow when practical.
