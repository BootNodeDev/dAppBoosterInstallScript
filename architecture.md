# Architecture Overview

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
    index.ts                  Barrel export
  components/
    steps/                    TUI step components (presentation-only)
      StackSelection.tsx      First step: pick a stack (skipped if preselectedStack is passed)
      ProjectName.tsx         Prompt for project name
      CloneRepo/CloneRepo.tsx Clone progress display (receives stack)
      InstallationMode.tsx    Full / Custom selection
      OptionalPackages.tsx    Feature multiselect (per-stack)
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
    utils.ts                  Stack-aware helpers, validation, path helpers
  __tests__/                  Mirrors source/ layout
```

## Key Abstractions

### Stack (`source/constants/config.ts`)

```ts
type Stack = 'evm' | 'canton'

type StackConfig = {
  label: string
  description: string
  repoUrl: string
  refType: 'tag-latest' | 'branch'
  ref?: string                              // required when refType === 'branch'
  packageManager: 'pnpm' | 'npm'
  removeAfterClone: string[]                // paths nuked between clone and `git init` (empty for both stacks today)
  envFiles: Array<{ from: string; to: string; ifFeature?: string }>
  features: Record<string, FeatureDefinition>
}
```

`getStackConfig(stack)` reads the base config and overlays the env-var overrides `DAPPBOOSTER_<STACK>_REPO_URL` and `DAPPBOOSTER_<STACK>_REF` before returning — that's the single hook for retargeting either stack at a fork or pre-release branch without editing code.

`getFeatureNames(stack)` and `isFeatureNameValid(stack, name)` are the per-stack feature accessors. There is no global `featureDefinitions` export — that would imply a single stack.

### Feature Definitions

Stored inside each stack's `features` map. Shape:

```ts
type FeatureDefinition = {
  description: string   // --info output
  label: string         // TUI multiselect display
  packages: string[]    // package-manager packages to remove when deselected (empty for canton features today)
  default: boolean      // --info output
  postInstall?: string[] // post-install instructions for non-interactive JSON output
  paths?: string[]       // files/dirs removed when the feature is deselected (Canton, data-driven cleanup)
  requires?: FeatureName[] // features this one depends on (one-directional, transitive)
}
```

When adding a new feature, add it to the relevant stack's `features` map. Programmatic consumers pick it up automatically. Canton feature cleanup is fully data-driven from `paths` (see `cleanupFiles.ts` below), so a new Canton feature needs no cleanup code — only its `paths`. EVM features still need an explicit per-feature cleanup function. The CLI `--help` text in `cli.tsx` maintains its own copy in both cases.

**Feature dependencies (`requires`)** are resolved by pure helpers in `utils.ts`. `resolveSelectedFeatures(stack, selected)` expands a selection to include every transitive requirement (used by the non-interactive path, so `--features e2e` yields `[counter, e2e]`). `applyFeatureToggle(stack, selection, toggled, action)` keeps the interactive multiselect consistent: selecting a feature pulls its requirements in, deselecting one cascades its dependents out. `e2e requires counter` is the only dependency today. `--info` surfaces each feature's `requires` so agents can resolve dependencies themselves.

### Operations Layer (`source/operations/`)

Plain async functions, no UI dependencies. Each operation that varies per stack takes `stack: Stack` as its first argument. Multi-step operations accept an optional `onProgress` callback for the TUI; the non-interactive path omits it.

| Function | What it does |
|---|---|
| `cloneRepo(stack, projectName, onProgress?)` | Reads `stack.refType`. **tag-latest**: shallow clone with `--no-checkout`, `git fetch --tags`, then `git checkout $(git describe --tags …)` (shell required for `$()`). **branch**: shallow clone with `--branch <stack.ref> --single-branch` (no shell). After that, runs `fs.rm` for every entry in `stack.removeAfterClone` (empty for both stacks today), removes `.git`, and reinitializes with `git init`. Uses `execFile` everywhere except the tag-latest shell substitution. |
| `createEnvFile(stack, projectFolder, features?)` | Copies every entry from `stack.envFiles`. Entries with `ifFeature` are skipped unless the named feature is in the selection (e.g. Canton's `carpincho-wallet/.env.local` only when `carpincho` is selected). |
| `installPackages(stack, projectFolder, mode, features, onProgress?)` | Uses `stack.packageManager`. Full: `<pm> install`. Custom with packages to remove: `<pm> remove` (pnpm) or `<pm> uninstall` (npm) + `<pm> run postinstall`. Custom with all features: `<pm> install`. `execFile` only — never shell. |
| `cleanupFiles(stack, projectFolder, mode, features, onProgress?)` | First runs **repository hygiene** (every stack/mode): both stacks always remove `.github` (CI) and the husky/commitlint automation (`.husky`, `.lintstagedrc.mjs`, `commitlint.config.js`) and sanitize tooling deps/scripts from `package.json`; **EVM additionally** always removes its own agent metadata (`.claude`, `AGENTS.md`, `CLAUDE.md`, `architecture.md`), whereas **Canton keeps that metadata** under the optional `llm` feature. Then dispatches to `cleanupEvmFiles` or `cleanupCantonFiles`. EVM removes deselected feature files via per-feature functions plus the `.install-files` staging directory, and patches `package.json` by feature name. Canton cleanup is **data-driven**: it loops the stack's features and, in custom mode, removes each deselected feature's `paths` (e.g. `counter/`, `e2e/`, `carpincho-wallet`, the `llm` artifact paths). The removed directories then drive `package.json` script stripping by **command target** — any script whose command invokes a removed directory is dropped (so deselecting `carpincho` strips `wallet:dev` / `carpincho:build:extension`). Command-based matching keeps cleanup correct as the upstream repo renames or adds scripts. In `full` mode no feature paths are removed, so a full Canton scaffold keeps `carpincho-wallet`, the agent docs, and every script. Canton then makes an initial `git` commit of the scaffold. |

### Shell Execution (`source/operations/exec.ts`)

Two helpers with different security profiles:

- **`execFile(file, args, options)`** — wraps `child_process.spawn` without a shell. Arguments are passed as an array, so user input cannot be interpreted as shell metacharacters. Use this whenever user-provided values (e.g., `projectName`) appear in the command.
- **`exec(command, options)`** — wraps `child_process.spawn` to run `/bin/sh -c <command>` (spawns a shell). Only for commands that require shell features like `$(...)` substitution. Never interpolate user input into the command string.

Both helpers use `spawn` with stdout ignored and stderr piped. They do not capture or return stdout — output is not buffered for the caller. They throw on non-zero exit codes with the stderr message, or report the signal name when the process is killed by a signal.

## Data Flow

### Non-interactive (agent)

```
CLI flags (string)
  → meow parses to typed flags
  → resolveStackFlag merges --canton / --evm / --stack and rejects conflicts
  → validate() converts to { stack, name, mode, features: FeatureName[] }
  → operations receive typed args (stack first)
  → JSON output to stdout
```

**Routing:** `source/cli.tsx`

```
conflicting stack flags  →  JSON error → exit 1
--info  →  source/info.ts → print JSON (optionally filtered by stack) → exit 0
--ni / !isTTY  →  source/nonInteractive.ts → validate → operations → JSON
default  →  dynamic import ink + App (preselectedStack passed if resolved) → TUI
```

**Non-interactive validation order:**
1. `--stack` (if explicit) is a valid stack name (else error). When unset, defaults to `evm`.
2. `--name` required
3. `--mode` required
4. `--name` matches `/^[a-zA-Z0-9_]+$/`
5. `--mode` is `full` or `custom`
6. Full mode: skip to step 10 (features ignored, all stack features installed)
7. `--features` required for custom mode
8. Parsed features list is non-empty (rejects trailing commas, whitespace-only entries)
9. Every feature name is valid **for the selected stack**
10. Project directory does not already exist

**Non-interactive execution order:**
`cloneRepo` → `createEnvFile` → `installPackages` → `cleanupFiles` → success JSON

Any error produces `{ "success": false, "error": "..." }` and exit code 1. Errors set `process.exitCode = 1` and throw rather than calling `process.exit()` directly, ensuring stdout flushes before the process terminates when piped.

**Success output:**
```json
{
  "success": true,
  "stack": "evm|canton",
  "projectName": "...",
  "mode": "full|custom",
  "features": ["..."],
  "path": "/absolute/path",
  "postInstall": ["..."]
}
```

For full mode, `features` lists all of the stack's feature names. For custom mode, only the selected ones.

### Interactive (human)

```
User input via Ink components
  → useState in App.tsx (stack, projectName, setupType, selectedFeatures)
  → passed as props to step components
  → components convert MultiSelectItem[] → FeatureName[]
  → operations receive typed args (stack first)
  → Ink renders progress/status
```

Steps: StackSelection → ProjectName → CloneRepo → InstallationMode → OptionalPackages → Install → FileCleanup → PostInstall

When `cli.tsx` resolves a stack flag, it passes `preselectedStack` to `<App>`, which skips the StackSelection step by starting `currentStep` at 2.

Components are presentation-only — they call operations via `useEffect` and render status. Components receive `MultiSelectItem[]` for feature selection (TUI concern) and convert to `FeatureName[]` before calling operations. `PostInstall` renders stack-specific instructions; the EVM branch shows the subgraph warning when applicable, the Canton branch shows the `canton:up`/`app:dev` commands and — when the `carpincho` feature is selected (or full mode) — the Carpincho extension build/load instructions.

## How to Add a New Stack

1. **`source/constants/config.ts`** — add a `Stack` union member and a `stackDefinitions` entry: `label`, `description`, `repoUrl`, `refType`, optional `ref`, `packageManager`, `removeAfterClone`, `envFiles`, `features`.
2. **`source/operations/cleanupFiles.ts`** — add a `cleanupXxxFiles` function and route to it from the top-level `cleanupFiles` dispatcher.
3. **`source/components/steps/PostInstall.tsx`** — add stack-specific post-install JSX.
4. **`source/cli.tsx`** — add a shortcut flag (e.g. `--myStack`) and extend `resolveStackFlag`; update `--help` text.
5. **Tests** — add per-stack assertions to `nonInteractive.test.ts`, `info.test.ts`, `cloneRepo.test.ts`, `installPackages.test.ts`, `cleanupFiles.test.ts`, `createEnvFile.test.ts`.
6. **Verify** — `pnpm build && pnpm lint && pnpm test`. Smoke-test with `DAPPBOOSTER_<STACK>_REPO_URL=file:///path/to/local/clone`.

## How to Add a New Feature to an Existing Stack

1. **`source/constants/config.ts`** — add an entry to the stack's `features` map. For **Canton**, also list the feature's `paths`: cleanup is data-driven, so no cleanup code is needed and scripts that target a removed directory are stripped automatically. If it ships an env file, add an `ifFeature`-gated `envFiles` entry.
2. **`source/operations/cleanupFiles.ts`** — **EVM only**: add a cleanup function for the feature and call it from `cleanupEvmFiles` when deselected; if it has scripts, add removal to `patchPackageJsonEvm`. Canton needs no change here.
3. **`source/components/steps/PostInstall.tsx`** — extend stack-specific instructions if needed.
4. **`source/cli.tsx`** — update the `--help` text.
5. **Tests** — add assertions in the relevant test files. nonInteractive, info, installPackages, and utils tests pick up new features automatically through `stackDefinitions`.
6. **Verify** — `pnpm build && pnpm lint && pnpm test`.

## How to Add a New Operation

1. Create `source/operations/newOperation.ts` — export an async function. Use `execFile` for commands with user input, `exec` only when shell features are needed. If behavior depends on the stack, take `stack: Stack` as the first argument.
2. Export from `source/operations/index.ts`.
3. Call from `source/nonInteractive.ts` (in the execution sequence) and from the relevant TUI component.
4. Add tests in `source/__tests__/operations/newOperation.test.ts` — mock `exec`/`execFile` to verify correct commands.

## Security

- User input (`projectName`) is validated against `/^[a-zA-Z0-9_]+$/` before any use.
- Operations use `execFile` (no shell) for commands that include user input or stack-config values.
- `exec` (shell) is reserved for the EVM tag-latest checkout (`git checkout $(git describe …)`); it never receives user input in the command string.
- Stack `repoUrl` and `ref` may come from the environment (`DAPPBOOSTER_<STACK>_REPO_URL`, `DAPPBOOSTER_<STACK>_REF`) but are passed to git via `execFile`, not interpolated into shell strings.
- Child process stdout is ignored and stderr is piped (captured for error diagnostics only), guaranteeing clean JSON on the parent's stdout.
