# AGENTS.md

## Scope

These instructions apply to `apps/bridge-a`.

Before feature work, read:

- `README.md`
- `prompts/feature-context.md`

## Rules

- This is a Node.js CLI tool targeting Windows 10/11 (폐쇄망). No external network calls.
- Keep all dependencies CommonJS-compatible (chalk v4, not v5; no ESM-only packages).
- Do not add runtime dependencies that break `@vercel/ncc` or `pkg` bundling.
- External files (`config.json`, `rules/`, `troubleshoot.md`) live alongside the executable — do not embed them in the bundle.
- Use `getBaseDir()` from `utils/config.ts` for all external file path resolution.
- Do not use `any`.

## Validation

- `npm run dev -- gen "test"` for local smoke test
- Bundle check: `npm run bundle` then `node dist/bundle/index.js --help`
