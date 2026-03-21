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
  cli.tsx                     Entry point: meow arg parsing, mode routing
  app.tsx                     Interactive TUI: step-based state machine
  nonInteractive.ts           Non-interactive: validate flags → run operations → JSON
  info.ts                     --info JSON output for agent discovery
  constants/
    config.ts                 Single source of truth: feature definitions, repo URL
  operations/
    exec.ts                   exec (shell) and execFile (no shell) helpers
    cloneRepo.ts              Shallow clone, checkout latest tag, reinit git
    createEnvFile.ts          Copy .env.example → .env.local
    installPackages.ts        pnpm install / remove based on mode and features
    cleanupFiles.ts           Remove files for deselected features, patch package.json
    index.ts                  Barrel export
  components/
    steps/                    TUI step components (presentation-only)
      ProjectName.tsx         Prompt for project name
      CloneRepo/CloneRepo.tsx Clone progress display
      InstallationMode.tsx    Full / Custom selection
      OptionalPackages.tsx    Feature multiselect
      Install/Install.tsx     Install progress display
      FileCleanup.tsx         Cleanup progress display
      PostInstall.tsx         Post-install instructions
    Ask.tsx                   Text input with validation
    Divider.tsx               Section divider
    MainTitle.tsx             Gradient title banner
    Multiselect/              Checkbox multiselect component
  types/
    types.ts                  Shared TypeScript types
  utils/
    utils.ts                  Validation, path helpers, package resolution
  __tests__/                  Mirrors source/ layout
    nonInteractive.test.ts
    info.test.ts
    utils.test.ts
    operations/
      exec.test.ts
      cloneRepo.test.ts
      createEnvFile.test.ts
      installPackages.test.ts
      cleanupFiles.test.ts
```

## Key Abstractions

### Feature Definitions (`source/constants/config.ts`)

Single source of truth for feature metadata. All programmatic consumers (`--info`, validation, TUI multiselect, operations) read from here. CLI `--help` text maintains its own copy.

```ts
featureDefinitions: Record<FeatureName, {
  description: string   // --info output
  label: string         // TUI multiselect display
  packages: string[]    // pnpm packages to remove when deselected
  default: boolean      // --info output
  postInstall?: string[] // post-install instructions for agents and TUI
}>
```

`featureNames` is derived as `Object.keys(featureDefinitions)`.

When adding a new feature, add it here. Programmatic consumers (validation, info output, TUI selection) pick it up automatically — except `cleanupFiles.ts` (which needs explicit cleanup rules) and the CLI `--help` text in `cli.tsx` (which maintains its own copy).

### Operations Layer (`source/operations/`)

Plain async functions with no UI dependencies. Each operation receives explicit arguments (project folder, mode, features) and performs file system or shell work. Multi-step operations accept an optional `onProgress` callback that the TUI uses to render per-step progress; the non-interactive path omits it.

| Function | What it does |
|---|---|
| `cloneRepo(projectName, onProgress?)` | Shallow clone, fetch tags, checkout latest tag, rm .git, git init. Uses `execFile` (no shell) for git commands except `git checkout $(...)` which needs shell substitution. Uses `fs.rm` for .git removal. |
| `createEnvFile(projectFolder)` | Copy .env.example to .env.local via `fs.copyFile` |
| `installPackages(projectFolder, mode, features, onProgress?)` | Full: `pnpm i`. Custom with packages to remove: `pnpm remove` + postinstall. Custom with all features: `pnpm i`. Uses `execFile` exclusively (no shell). |
| `cleanupFiles(projectFolder, mode, features, onProgress?)` | Remove files/folders for deselected features, patch package.json scripts, remove .install-files. Uses `node:fs/promises` (`rm`, `mkdir`, `copyFile`) for async operations; `patchPackageJson` uses sync `node:fs`. |

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
  → validate() converts to { name, mode, features: FeatureName[] }
  → operations receive typed args
  → JSON output to stdout
```

**Routing:** `source/cli.tsx`

```
--info  →  source/info.ts → print JSON → exit 0
--ni / !isTTY  →  source/nonInteractive.ts → validate → operations → JSON
default  →  dynamic import ink + App → TUI
```

**Non-interactive validation order:**
1. `--name` required
2. `--mode` required
3. `--name` matches `/^[a-zA-Z0-9_]+$/`
4. `--mode` is `full` or `custom`
5. Full mode: skip to step 9 (features ignored, all installed)
6. `--features` required for custom mode
7. Parsed features list is non-empty (rejects trailing commas, whitespace-only entries)
8. All feature names are valid keys in `featureDefinitions`
9. Project directory does not already exist

**Non-interactive execution order:**
`cloneRepo` → `createEnvFile` → `installPackages` → `cleanupFiles` → success JSON

Any error produces `{ "success": false, "error": "..." }` and exit code 1. Errors set `process.exitCode = 1` and throw rather than calling `process.exit()` directly, ensuring stdout flushes before the process terminates when piped.

**Success output:**
```json
{
  "success": true,
  "projectName": "...",
  "mode": "full|custom",
  "features": ["..."],
  "path": "/absolute/path",
  "postInstall": ["..."]
}
```

For full mode, `features` lists all feature names. For custom mode, only the selected ones.

### Interactive (human)

```
User input via Ink components
  → useState in App.tsx
  → passed as props to step components
  → components convert MultiSelectItem[] → FeatureName[]
  → operations receive typed args
  → Ink renders progress/status
```

Steps: ProjectName → CloneRepo → InstallationMode → OptionalPackages → Install → FileCleanup → PostInstall

Components are presentation-only — they call operations via `useEffect` and render status. Components receive `MultiSelectItem[]` for feature selection (TUI concern) and convert to `FeatureName[]` before calling operations.

## How to Add a New Feature

1. **`source/constants/config.ts`** — add entry to `featureDefinitions` with description, label, packages, default, and optional postInstall. Add the name to the `FeatureName` union type.

2. **`source/operations/cleanupFiles.ts`** — add a cleanup function and call it from `cleanupFiles()` when the feature is deselected. If the feature has scripts in package.json, add removal to `patchPackageJson`.

3. **Tests** — add test cases in `source/__tests__/operations/cleanupFiles.test.ts` for the new cleanup rules. The nonInteractive, info, installPackages, and utils tests pick up new features automatically since they read from `featureDefinitions`.

4. **Verify** — `pnpm build && pnpm lint && pnpm test`

Steps 1 and 4 are always required. Steps 2-3 only apply if the feature has files/folders to clean up.

## How to Add a New Operation

1. Create `source/operations/newOperation.ts` — export an async function. Use `execFile` for commands with user input, `exec` only when shell features are needed.

2. Export from `source/operations/index.ts`.

3. Call from `source/nonInteractive.ts` (in the execution sequence) and from the relevant TUI component.

4. Add tests in `source/__tests__/operations/newOperation.test.ts` — mock `exec`/`execFile` to verify correct commands.

## Security

- User input (`projectName`) is validated against `/^[a-zA-Z0-9_]+$/` before any use
- Operations use `execFile` (no shell) for commands that include user input
- `exec` (shell) is reserved for commands needing shell substitution, and never receives user input in the command string
- Child process stdout is ignored and stderr is piped (captured for error diagnostics only), guaranteeing clean JSON on the parent's stdout
