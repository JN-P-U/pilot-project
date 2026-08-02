# AGENTS.md

## Scope

These instructions apply to the whole repository unless a more specific `AGENTS.md` exists in a subdirectory.

This is an npm workspace monorepo of independent browser-based utilities. Treat each `apps/*` project as an independent project with its own purpose, runtime, dependencies, and validation flow.

## Monorepo Rules

- Do not assume one app's UI, architecture, or dependency rules apply to another app.
- Before changing an app, read that app's `README.md`, `package.json`, source structure, and any local `prompts/feature-context.md`.
- Share code between apps only when there is an explicit package, workspace dependency, or user request.
- Treat root `package.json`, `package-lock.json`, workspace configuration, and shared package changes as repository-wide changes.
- Keep changes scoped to the requested app/package.
- Preserve Korean UI copy and README tone unless the user asks otherwise.
- Do not use `any`; define interfaces/types for props, payloads, and API-like data.
- If package versions or external APIs are uncertain, inspect local files first.
- Do not revert user changes.

## Validation

- Prefer app-specific scripts from the target app's `package.json`.
- If a change affects root workspace configuration, mention the repository-wide impact.
- If tests or builds cannot be run, say so clearly.

## Agent Notes

- Cursor rules live in `.cursor/rules`.
- Claude Code instructions live in `CLAUDE.md`.
- Feature prompts are kept near each app/package in `prompts/feature-context.md`.
