# CLAUDE.md

Use this memory for work under `apps/bridge-a`.

@prompts/feature-context.md

## Rules

- This is a Node.js CLI tool targeting Windows 10/11 (폐쇄망). No external network calls.
- Keep all dependencies CommonJS-compatible (chalk v4, not v5; no ESM-only packages).
- Do not add runtime dependencies that break `@vercel/ncc` or `pkg` bundling.
- External files (`config.json`, `rules/`, `troubleshoot.md`) live alongside the executable — do not embed them in the bundle.
- Use `getBaseDir()` from `utils/config.ts` for all external file path resolution.
- `any` 사용 금지.

## Validation

- `npm run dev -- gen "test"` 으로 로컬 동작 확인
- 번들 검증: `npm run bundle` 후 `node dist/bundle/index.js --help`
