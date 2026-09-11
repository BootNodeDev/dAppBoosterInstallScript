# Architecture Overview

Index for the dAppBooster installer architecture. The detail lives in focused sub-docs under
[`docs/architecture/`](./docs/architecture/) — open only the one you need rather than loading
everything.

| Doc | Read it when you're… | Covers |
|---|---|---|
| [abstractions](./docs/architecture/abstractions.md) | touching the stack config model, operations, or shell exec | `Stack`/`StackConfig` (`prepare`, `staging`, `initialCommit`, `minNodeVersion`), `FeatureDefinition` (`paths`, `scripts`, `packages`, `requires`), operations layer, `exec`/`execFile`, security |
| [data-flow](./docs/architecture/data-flow.md) | changing CLI routing or the step sequence | non-interactive validation/execution order, JSON output, interactive step flow |
| [extending](./docs/architecture/extending.md) | adding a stack, feature, or operation | step-by-step checklists for each |

## Tech Stack

| Category | Technology | Notes |
|----------|-----------|-------|
| Framework | React + Ink | Terminal UI for interactive mode |
| Language | TypeScript (strict mode) | Extends `@sindresorhus/tsconfig`. `tsconfig.json` builds `source/`; `tsconfig.tests.json` typechecks the tests |
| Arg parsing | meow | CLI flag parsing, non-interactive mode |
| Styling | Ink primitives | `<Box>`, `<Text>`, ink-gradient, ink-big-text |
| Testing | Vitest + @vitest/coverage-v8 | |
| Lint + format | Biome 2 | `biome.json`; one tool for both |
| Dead code | knip | `knip.json`; entry points are `cli.tsx` and the test files |
| Node | v22+ published, 24 for development | `engines.node` is the floor; `.nvmrc` is what CI uses. A stack can require more of the scaffold: Canton needs 24.15 |

## Project Structure

```
source/
  cli.tsx                     Entry point: meow arg parsing, stack resolution, mode routing
  app.tsx                     Interactive TUI: step-based state machine, threads `stack` through every step
  nonInteractive.ts           Non-interactive: validate flags → run operations → JSON
  info.ts                     --info JSON output for agent discovery (optionally filtered by stack)
  stacks/
    evm.ts                    The EVM StackConfig and its features
    canton.ts                 The Canton StackConfig (no features)
    index.ts                  stackDefinitions, stackNames, and the config/feature accessors
  operations/
    exec.ts                   exec (shell) and execFile (no shell) helpers
    cloneRepo.ts              Check stack.minNodeVersion, clone (tag-latest OR branch), rm .git, git init
    createEnvFile.ts          Copy each stack's envFiles
    installPackages.ts        Stack-aware: uses stack.packageManager (pnpm or npm)
    cleanupFiles.ts           Applies stack.prepare, removes deselected features, patches package.json — all before the install
    createInitialCommit.ts    Commits the finished scaffold (stacks that ask for it)
    installGuard.ts           Removes the partial project dir if interrupted mid-scaffold
    index.ts                  Barrel export
  components/
    steps/                    TUI step components (presentation-only)
      ProjectName.tsx         First step: prompt for the project name
      StackSelection.tsx      Pick a stack (skipped when preselectedStack is passed)
      CloneRepo/CloneRepo.tsx Clone progress display (receives stack)
      InstallationMode.tsx    Mode selection (skipped for a stack with no features)
      OptionalPackages.tsx    Feature multiselect (skipped for a stack with no features)
      FileCleanup.tsx         Cleanup progress display, runs before the install
      Install/Install.tsx     Env files, package install and baseline commit
      StepProgress.tsx        Shared runner for the operation steps: progress, errors, guard
      PostInstall.tsx         Renders the stack's postInstallComponent, or its postInstall lines
      EvmPostInstall.tsx      The EVM closing screen, including the subgraph warning
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
