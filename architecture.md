# Architecture Overview

Index for the dAppBooster installer architecture. The detail lives in focused sub-docs under
[`docs/architecture/`](./docs/architecture/) — open only the one you need rather than loading
everything.

| Doc | Read it when you're… | Covers |
|---|---|---|
| [abstractions](./docs/architecture/abstractions.md) | touching the config model, operations, or shell exec | `Stack`/`StackConfig`, `FeatureDefinition` (`paths`, `requires`), operations layer, `exec`/`execFile`, security |
| [data-flow](./docs/architecture/data-flow.md) | changing CLI routing or the step sequence | non-interactive validation/execution order, JSON output, interactive step flow |
| [extending](./docs/architecture/extending.md) | adding a stack, feature, or operation | step-by-step checklists for each |

## Tech Stack

| Category | Technology | Notes |
|----------|-----------|-------|
| Framework | React + Ink | Terminal UI for interactive mode |
| Language | TypeScript (strict mode) | Extends `@sindresorhus/tsconfig` |
| Arg parsing | meow | CLI flag parsing, non-interactive mode |
| Styling | Ink primitives | `<Box>`, `<Text>`, ink-gradient, ink-big-text |
| Testing | Vitest + @vitest/coverage-v8 | |
| Node | v20+ | See `.nvmrc` |

## Project Structure

```
source/
  cli.tsx                     Entry point: meow arg parsing, stack resolution, mode routing
  app.tsx                     Interactive TUI: step-based state machine, threads `stack` through every step
  nonInteractive.ts           Non-interactive: validate flags → run operations → JSON
  info.ts                     --info JSON output for agent discovery (optionally filtered by stack)
  constants/
    config.ts                 Single source of truth: Stack type, stackDefinitions, env-var overrides
  operations/
    exec.ts                   exec (shell) and execFile (no shell) helpers
    cloneRepo.ts              Clone (tag-latest OR branch), apply stack.removeAfterClone, rm .git, git init
    createEnvFile.ts          Copy each stack's envFiles (with optional ifFeature gate)
    installPackages.ts        Stack-aware: uses stack.packageManager (pnpm or npm)
    cleanupFiles.ts           Dispatches to per-stack cleanup (cleanupEvmFiles / cleanupCantonFiles)
    installGuard.ts           Removes the partial project dir if interrupted mid-scaffold
    index.ts                  Barrel export
  components/
    steps/                    TUI step components (presentation-only)
      StackSelection.tsx      First step: pick a stack (skipped if preselectedStack is passed)
      ProjectName.tsx         Prompt for project name
      CloneRepo/CloneRepo.tsx Clone progress display (receives stack)
      InstallationMode.tsx    Full / Custom selection
      OptionalPackages.tsx    Feature multiselect (per-stack, enforces feature dependencies)
      Install/Install.tsx     Install progress display (receives stack)
      FileCleanup.tsx         Cleanup progress display (receives stack)
      PostInstall.tsx         Post-install instructions, stack-specific
    Ask.tsx                   Text input with validation
    Divider.tsx               Section divider
    MainTitle.tsx             Gradient title banner
    Multiselect/              Checkbox multiselect component
  types/
    types.ts                  Shared TypeScript types
  utils/
    utils.ts                  Stack-aware helpers, feature-dependency resolution, validation, path helpers
  __tests__/                  Mirrors source/ layout
```
