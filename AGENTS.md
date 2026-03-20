# Agent Configuration

> `CLAUDE.md` points to this file so Claude Code picks it up automatically. Other agents (Cursor, Windsurf, etc.) read `AGENTS.md` natively.

---

## What This Is

A CLI installer tool for dAppBooster projects. It supports two modes:

- **Interactive** (default): React + Ink TUI that walks users through project naming, repo cloning, installation mode selection, optional packages, and post-install steps.
- **Non-interactive**: Flag-driven mode (`--ni` or auto-detected when not a TTY) for AI agents and CI. Outputs JSON to stdout. Run `--info` for feature discovery, then `--name` + `--mode` [+ `--features`] to install.

## Stack & Conventions

| Category | Technology | Notes |
|----------|-----------|-------|
| Language | TypeScript (strict mode) | Extends `@sindresorhus/tsconfig` |
| Framework | React + Ink | Terminal UI framework |
| Arg parsing | meow | CLI flag parsing for non-interactive mode |
| Package manager | pnpm | Never npm or yarn |
| Linting/formatting | Biome | Run `pnpm lint` before committing |
| Testing | Vitest + @vitest/coverage-v8 | |
| Node | v20+ | See `.nvmrc` |
| Naming | camelCase vars/functions, PascalCase components/types | |

## Code Style

- **Semicolons:** no
- **Quotes:** single
- **Print width:** 100
- **Trailing commas:** none (Biome default)
- **Indent:** spaces, width 2
- **Imports:** explicit `.js` extensions (ESM, `"type": "module"`)

## Working Rules

- Use **pnpm** only (never npm or yarn)
- Treat `dist/` as build output — never edit directly
- User input (`projectName`) must never be interpolated into shell command strings — use `execFile` (args array) instead
- `source/constants/config.ts` is the single source of truth for feature metadata — all consumers read from it
- Components are presentation-only — business logic lives in `source/operations/`

## Architecture

See [architecture.md](./architecture.md) for the full architecture guide, including data flow, how to add features, and security patterns.

Entry: `source/cli.tsx` — parses args with `meow`, routes between interactive and non-interactive paths.

- **Interactive path**: `source/app.tsx` — step-based state machine that renders each installer step in sequence via React + Ink
- **Non-interactive path**: `source/nonInteractive.ts` — validates flags, runs operations sequentially, outputs JSON

Key directories:

- `source/operations/` — business logic as plain async functions, shared by both paths
- `source/components/steps/` — TUI step components, presentation-only
- `source/components/` — reusable UI components (Ask, Divider, MainTitle, Multiselect)
- `source/__tests__/` — vitest test suite

## Testing

- **Framework:** Vitest + V8 coverage
- **Run tests:** `pnpm test` / `pnpm test:coverage`
- **Structure:** `source/__tests__/` mirrors `source/` layout. Operations tests live in `source/__tests__/operations/`
- **What to test:** Non-interactive agentic flow (validation, JSON output), operations (correct shell commands), config, utils
- **What not to test:** React/Ink components, `exec.ts` internals (mocked in all consumers)
- **Mocking pattern:** Operations tests mock `exec`/`execFile` from `source/operations/exec.js`. Non-interactive tests mock the entire operations layer
- **Coverage:** Focus on the agentic interface. Test files and `source/components/` are excluded from coverage

## Guardrails

- Do not commit secrets, API keys, or credentials
- Do not modify CI/CD pipelines without team review
- Do not skip tests or linting to make a build pass
- When in doubt, ask — don't assume

## Change Strategy

- Prefer small, focused diffs over broad refactors
- Preserve existing UX unless the task explicitly changes it
- Avoid introducing new patterns when a project pattern already exists
- Update docs only when behavior or workflow changes

## Validation Checklist

- `pnpm build`
- `pnpm lint`
- `pnpm test`

## Release

GitHub Actions workflow (`.github/workflows/release.yml`) triggers on GitHub release events. Pre-releases do a dry-run; full releases publish to npm.
