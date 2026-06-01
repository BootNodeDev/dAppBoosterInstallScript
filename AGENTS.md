# Agent Configuration

> `CLAUDE.md` points to this file so Claude Code picks it up automatically. Other agents (Cursor, Windsurf, etc.) read `AGENTS.md` natively.

---

## What This Is

A CLI installer tool for dAppBooster projects. It supports two **stacks** and two **modes**:

- **Stacks:** `evm` (the original dAppBooster for EVM chains) and `canton` (dAppBooster for Canton: Daml ledger, Carpincho wallet, off-chain services). Each stack declares its own source repository, ref strategy (tag-latest vs branch), package manager, env files, optional `removeAfterClone` paths, and features.
- **Interactive** (default): React + Ink TUI that prompts for stack first, then project name, then clone → installation mode → optional packages → install → cleanup → post-install. The stack prompt is skipped when `--canton`, `--evm`, or `--stack` is supplied.
- **Non-interactive**: Flag-driven (`--ni` or auto-detected when not a TTY) for AI agents and CI. Outputs JSON to stdout. Run `--info` for stack + feature discovery, then `--canton`/`--evm` (or `--stack`) + `--name` + `--mode` [+ `--features`]. Omitting a stack flag in non-interactive mode defaults to `evm` for backward compatibility.

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

- **Semicolons:** as needed (Biome `asNeeded` — omitted unless required by ASI)
- **Quotes:** single
- **Print width:** 100
- **Trailing commas:** all (Biome default)
- **Indent:** spaces, width 2
- **Imports:** explicit `.js` extensions (ESM, `"type": "module"`)

## Working Rules

- Use **pnpm** only for this installer (never npm or yarn). The Canton stack scaffolds an npm project; that's a property of the generated project, not this installer.
- Treat `dist/` as build output — never edit directly
- User input (`projectName`) must never be interpolated into shell command strings — use `execFile` (args array) instead
- `source/constants/config.ts` is the single source of truth for stack and feature metadata — all programmatic consumers read it through `getStackConfig(stack)`. CLI `--help` text maintains its own copy.
- Stack overrides come from env vars `DAPPBOOSTER_<STACK>_REPO_URL` and `DAPPBOOSTER_<STACK>_REF` (read inside `getStackConfig`) — useful for forks and pre-release testing.
- Components are presentation-only — business logic lives in `source/operations/`. Every operation that varies per stack takes `stack` as its first argument.

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
- **What not to test:** React/Ink components
- **Mocking pattern:** Operations tests mock `exec`/`execFile` from `source/operations/exec.js`. `exec.test.ts` mocks `child_process.spawn` directly to test the helpers themselves. Non-interactive tests mock the entire operations layer
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
