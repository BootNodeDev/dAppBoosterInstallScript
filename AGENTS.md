# AGENTS.md

This file provides guidance to AI coding agents working with code in this repository.

## What This Is

A CLI installer tool for dAppBooster projects, built with React + Ink (terminal UI framework). It walks users through an interactive setup flow: project naming, repo cloning, installation mode selection, optional packages, and post-install steps.

## Commands

- `pnpm build` — compile TypeScript (`tsc`)
- `pnpm dev` — watch mode compilation
- `pnpm test` — run tests (`vitest run`)
- `pnpm lint` — run Biome linter (`biome check`)
- `pnpm lint:fix` — auto-fix lint issues (`biome check --write`)

## Architecture

Entry: `source/cli.tsx` → renders the Ink React app.

`source/app.tsx` is the main component — a step-based state machine (`currentStep` integer) that renders each installer step in sequence. Steps advance via a `finishStep` callback.

### Key directories

- `source/components/steps/` — each installer step as a React component (ProjectName, CloneRepo, InstallationMode, OptionalPackages, Install, FileCleanup, PostInstall)
- `source/components/` — reusable UI components (Ask, Divider, MainTitle, Multiselect)
- `source/constants/config.ts` — feature package mappings and repo URL
- `source/types/types.ts` — shared TypeScript types
- `source/utils/utils.ts` — helper functions (validation, step visibility)

## Code Conventions

- **ESM**: `"type": "module"` — imports use explicit `.js` extensions
- **Formatting**: Biome — single quotes, no semicolons, 2-space indent, 100-char line width
- **Components**: Functional components with TypeScript (`FC<Props>`)
- **State**: Local `useState` only, props/callbacks for parent-child communication
- **Skip pattern**: Steps accept a `skip` prop to conditionally bypass themselves
- **Node**: Requires v20+ (see `.nvmrc`)

## Release

GitHub Actions workflow (`.github/workflows/release.yml`) triggers on GitHub release events. Pre-releases do a dry-run; full releases publish to npm.
