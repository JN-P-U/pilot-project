# CLAUDE.md

This repository contains independent browser-based utilities in an npm workspace monorepo.

## Project Memory

- Treat each `apps/*` project as independent unless a workspace dependency or user request connects it to another project.
- Keep root instructions thin. Feature-specific prompts belong near the app/package that owns the feature.
- Before changing a target app/package, read its local `README.md`, `package.json`, source structure, and `prompts/feature-context.md` when present.
- Do not apply one app's UI, architecture, or dependency rules to another app by default.
- Root `package.json`, `package-lock.json`, workspace configuration, and shared package edits can affect the whole repository.

## Coding Rules

- Keep changes scoped.
- Preserve Korean UI copy and documentation tone unless asked otherwise.
- Do not use `any`; define types/interfaces for props, payloads, and API-like data.
- Verify uncertain package versions or APIs from local files.
- Do not revert user changes.

## Validation

- Use the target app/package scripts first.
- Mention when a change affects the root workspace or another app.
- State clearly when tests/builds were not run.

## Related Files

- Cursor rules: `.cursor/rules`
- Codex/agent rules: `AGENTS.md`
- App/package feature prompts: `*/prompts/feature-context.md`
