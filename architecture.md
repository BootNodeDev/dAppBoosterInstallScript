# Architecture Overview

Architecture guide for the dAppBooster installer.

## Tech Stack

| Category | Technology | Notes |
|----------|-----------|-------|
| Framework | React + Ink | Terminal UI for interactive mode |
| Language | TypeScript (strict mode) | Extends `@sindresorhus/tsconfig`. `tsconfig.json` builds `source/`; `tsconfig.tests.json` typechecks the tests |
| Arg parsing | meow | CLI flag parsing, non-interactive mode |
| Styling | Ink primitives | `<Box>`, `<Text>`, ink-gradient, ink-big-text, ink-spinner |
| Testing | Vitest + @vitest/coverage-v8 | |
| Lint + format | Biome 2 | `biome.json`; one tool for both |
| Dead code | knip | `knip.json`; entry points are `cli.tsx` and the test files |
| Node | v24.15.0+ published, 24 for development | `engines.node` is the floor, matched to what dAppBooster needs; `.nvmrc` is what CI uses |

## Project Structure

```
source/
  cli.tsx                     Entry point: meow arg parsing, mode routing
  app.tsx                     Interactive TUI: step-based state machine
  nonInteractive.ts           Non-interactive: validate flags → run operations → JSON
  info.ts                     --info JSON output for agent discovery
  config.ts                   Feature definitions, prepare and staging paths, the repository to clone
  operations/
    exec.ts                   exec (shell) and execFile (no shell) helpers
    cloneRepo.ts              Check pnpm, clone at the newest tag or at DAPPBOOSTER_REF, rm .git, git init
    createEnvFile.ts          Copy .env.example to .env.local
    installPackages.ts        pnpm install, or pnpm remove for the features left out
    cleanupFiles.ts           Removes the prepare paths and the features left out, patches package.json — all before the install
    installGuard.ts           Removes the partial project dir if interrupted mid-scaffold
    index.ts                  Barrel export
  components/
    steps/                    TUI step components (presentation-only)
      ProjectName.tsx         First step: prompt for the project name
      InstallationMode.tsx    Mode selection: full or custom
      OptionalPackages.tsx    Feature multiselect (custom mode only)
      Confirmation.tsx        Review step, the last one before any disk work
      CloneRepo/CloneRepo.tsx Clone progress display
      FileCleanup.tsx         Cleanup progress display, runs before the install
      Install/Install.tsx     Env file and package install
      StepProgress.tsx        Shared runner for the operation steps: progress, errors, guard
      PostInstall.tsx         Closing screen, including the subgraph warning
    Ask.tsx                   Text input with validation
    Divider.tsx               Section divider
    MainTitle.tsx             Gradient title banner
    Multiselect/              Checkbox multiselect component
  types/
    types.ts                  Shared TypeScript types
  utils/
    utils.ts                  Feature and mode helpers, validation, path helpers
  __tests__/                  Mirrors source/ layout
```

## Key Abstractions

### Config (`source/config.ts`)

Everything the installer knows about the dAppBooster template:

- `featureDefinitions` — one entry per optional feature. `featureEntries`, `featureNames` and `defaultFeatureNames` are derived from it.
- `isFeatureNameValid(name)` — a type guard, so validated CLI input narrows from `string` to `FeatureName`.
- `prepare` — paths every scaffold drops, whatever the user picked: the template's own repo files (`.github`, `.claude`, the agent docs).
- `staging` — the template's `.install-files` directory, which holds the replacement files a deselected feature restores. Removed last.
- `getRepo()` — the repository URL and an optional `ref`. Without a `ref` the newest tag is cloned. The env vars `DAPPBOOSTER_REPO_URL` and `DAPPBOOSTER_REF` override both, for forks and pre-release testing.

`FeatureName` is the union of every feature name, declared in `source/types/types.ts`. `featureDefinitions` is typed `Record<FeatureName, FeatureDefinition>`, so the union and the map cannot drift apart without a compile error. Renaming a feature therefore turns every stale `'oldName'` string in the codebase into a compile error.

Installation modes are `full` (keep every feature) and `custom` (pick them).

### Feature Definitions

Shape:

```ts
type FeatureDefinition = {
  description: string    // --info output
  label: string          // TUI multiselect display
  packages: string[]     // dependencies the package manager removes when the feature is deselected
  default: boolean       // --info output, and pre-checked in the multiselect
  postInstall?: string[] // post-install instructions for non-interactive JSON output
  paths?: string[]       // files/dirs removed when the feature is deselected
  scripts?: string[]     // package.json scripts removed when the feature is deselected
}
```

When adding a new feature, add its name to the `FeatureName` union in `source/types/types.ts` and an entry to `featureDefinitions`. Programmatic consumers pick it up automatically. Feature cleanup is data-driven from `paths` and `scripts`, and removal of its `packages` is data-driven too (see the Operations Layer below), so a new feature usually needs no code. The one exception is `demo` and `subgraph`, which restore replacement source files from `.install-files`. The CLI `--help` text in `cli.tsx` maintains its own copy either way.

`packages` are always removed by the package manager (`pnpm remove`), which updates package.json and the lockfile together. Nothing hand-edits dependencies.

`resolveModeFeatures(mode, customSelection)` in `utils.ts` maps a mode to its kept-feature list, in config order: full → all, custom → the selection. The non-interactive path resolves it in `validate`; the interactive path resolves it once in `app.tsx` and passes the result to every step, so the review screen lists exactly what gets installed.

### Operations Layer (`source/operations/`)

Plain async functions, no UI dependencies. Multi-step operations accept an optional `onProgress` callback for the TUI; the non-interactive path omits it.

| Function | What it does |
|---|---|
| `cloneRepo(projectName, onProgress?)` | Fails first when `pnpm` is not installed, before anything touches the disk. Then clones. Without a `ref`: shallow clone with `--no-checkout`, `git fetch --tags`, then `git checkout $(git describe --tags …)` (shell required for `$()`). With `DAPPBOOSTER_REF` set, that tag or branch wins over the latest tag: `git fetch --depth 1 origin <ref>` then `git checkout FETCH_HEAD`, no shell. Removes `.git` and reinitializes with `git init`. Uses `execFile` everywhere except the latest-tag shell substitution. |
| `createEnvFile(projectFolder)` | Copies `.env.example` to `.env.local`. |
| `installPackages(projectFolder, mode, features, onProgress?)` | Nothing to remove (full mode, or a selection that drops no packages): `pnpm install`. Otherwise `pnpm remove`, which prunes the manifest and the lockfile together, then `pnpm run --if-present postinstall`. Runs after `cleanupFiles`, so it resolves the pruned manifest once. `execFile` only — never shell. |
| `cleanupFiles(projectFolder, mode, features, onProgress?)` | Config-driven, and runs **before** the install. First the `prepare` paths, dropped from every scaffold. Then, in `custom` mode, it loops the features and for each one the user left out removes its `paths` and collects its `scripts`, restores the demo-free home page from `.install-files` when `demo` or `subgraph` is dropped, and removes the collected scripts from package.json in a single pass, written only when a value changed. Feature dependencies are left to `installPackages`. The staging directory goes last, once the restores no longer need it. |

#### Interrupt safety (`installGuard`)

`source/operations/installGuard.ts` makes a Ctrl+C or a failure mid-scaffold leave no partial directory behind. `beginInstall(projectFolder)` is called the instant disk work starts (before `cloneRepo`) and registers `SIGINT`/`SIGTERM` handlers; `completeInstall()` is called once the install finishes; `abortInstall()` is called when an operation throws — it removes the partial directory and sets `process.exitCode = 1`, so a failed interactive run reports failure to the shell instead of exiting 0. The three interactive operation steps (`CloneRepo`, `FileCleanup`, `Install`) all call it through `StepProgress`. On an interrupt while a scaffold is in progress, the handler removes the project directory; after `completeInstall` it is a no-op, so a finished project (or a Ctrl+C on the post-install screen) is never deleted. It only ever removes a directory created this run — both entry paths reject a pre-existing directory up front — so user data is never touched. Both paths wire it in: the non-interactive runner brackets its operation block, and interactively `CloneRepo` calls `beginInstall` while `Install`, the last operation step, calls `completeInstall`.

### Shell Execution (`source/operations/exec.ts`)

Two helpers with different security profiles:

- **`execFile(file, args, options)`** — wraps `child_process.spawn` without a shell. Arguments are passed as an array, so user input cannot be interpreted as shell metacharacters. Use this whenever user-provided values (e.g., `projectName`) appear in the command.
- **`exec(command, options)`** — wraps `child_process.spawn` to run `/bin/sh -c <command>` (spawns a shell). Only for commands that require shell features like `$(...)` substitution. Never interpolate user input into the command string.

Both helpers use `spawn` with stdout ignored and stderr piped. They do not capture or return stdout — output is not buffered for the caller. They throw on non-zero exit codes with the stderr message, or report the signal name when the process is killed by a signal.

### Security

- User input (`projectName`) is validated against `/^[a-zA-Z0-9_][a-zA-Z0-9_-]*$/` before any use. The leading character cannot be a dash, or git would read the name as an option rather than a directory.
- Operations use `execFile` (no shell) for commands that include user input or config values.
- `exec` (shell) is reserved for the tag-latest checkout (`git checkout $(git describe …)`); it never receives user input in the command string.
- The repository URL and ref may come from the environment (`DAPPBOOSTER_REPO_URL`, `DAPPBOOSTER_REF`) but are passed to git via `execFile`, not interpolated into shell strings.
- Child process stdout is ignored and stderr is piped (captured for error diagnostics only), guaranteeing clean JSON on the parent's stdout.

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
2. `--name` matches `/^[a-zA-Z0-9_][a-zA-Z0-9_-]*$/` — a leading dash is rejected because git would read the name as an option
3. `--mode` required
4. `--mode` is `full` or `custom`
5. Full mode: skip to step 7 (every feature is kept, `--features` ignored)
6. Custom mode: `--features` required, parses to a non-empty list (rejects trailing commas, whitespace-only entries), and every name is valid
7. Project directory does not already exist

**Non-interactive execution order:**
`cloneRepo` → `cleanupFiles` → `createEnvFile` → `installPackages` → success JSON

Cleanup runs **before** the install on purpose: it prunes package.json, so the package manager resolves the pruned manifest once and the lockfile it writes matches. The reverse order left the generated project with a lockfile listing packages its package.json no longer had, which fails a frozen-lockfile install.

Any error produces `{ "success": false, "error": "..." }` and exit code 1. `reportFailure` is the only place that prints it: it sets `process.exitCode = 1` and returns a `ReportedError`, which `fail()` throws. `cli.tsx` ignores that error type and reports anything else. Nothing calls `process.exit()` directly, so stdout flushes before the process terminates when piped.

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

For full mode, `features` lists every feature name; for custom mode, the selected ones in config order.

### Interactive (human)

```
User input via Ink components
  → useState in App.tsx (projectName, setupType, selectedFeatures)
  → passed as props to step components
  → components convert MultiSelectItem[] → FeatureName[]
  → operations receive typed args
  → Ink renders progress/status
```

All questions come **before** any disk work, mirroring the non-interactive path — so abandoning the wizard while answering leaves nothing behind.

```
Questions (no disk):  ProjectName → InstallationMode → OptionalPackages (custom only) → Confirmation
Operations (disk):    CloneRepo → FileCleanup → Install → PostInstall
```

Each operation step renders through the shared `StepProgress` component, which owns the step list, the running/done/error display and the failure path (`abortInstall`), so every step reports a failure the same way. `Install` covers the env file and the package install, and calls `completeInstall` when the scaffold is finished.

`Confirmation` shows the plan as one line per setting (`describeInstallPlan`), each value highlighted, and is the last side-effect-free step. **Yes** starts the operations; **No** loops back to the first question (state is reset and the question steps are re-keyed so they re-mount fresh).

Components are presentation-only — they call operations via `useEffect` and render status. Components receive `MultiSelectItem[]` for feature selection (TUI concern), then derive the kept-feature `FeatureName[]` via `resolveModeFeatures(mode, selected)` before calling operations — so `full` resolves correctly even though the multiselect is skipped. The `OptionalPackages` multiselect pre-checks `default: true` features. `PostInstall` adds the subgraph warning when that feature was kept.

## Extending the Installer

### How to Add a New Feature

1. **`source/types/types.ts`** — add the name to the `FeatureName` union.
2. **`source/config.ts`** — add an entry to `featureDefinitions` (leave one out and the file will not compile). `default: true` pre-checks it in the custom-mode multiselect. List the feature's `paths`, `scripts` and `packages`; cleanup and the install read all three, so no new code is needed.
3. **`source/operations/cleanupFiles.ts`** — only needed when the feature has to put a replacement file back, the way `demo` and `subgraph` copy from `.install-files`.
4. **Post-install** — add `postInstall` lines for the JSON output, and extend `PostInstall.tsx` if the wizard needs to say more.
5. **`source/cli.tsx`** — update the `--help` text.
6. **Tests** — add assertions in the relevant test files. nonInteractive, info, installPackages, and utils tests pick up new features automatically through `featureDefinitions`.
7. **Verify** — `pnpm build && pnpm lint && pnpm test`.

### How to Add a New Operation

1. Create `source/operations/newOperation.ts` — export an async function. Use `execFile` for commands with user input, `exec` only when shell features are needed.
2. Export from `source/operations/index.ts`.
3. Call from `source/nonInteractive.ts` (in the execution sequence) and from the relevant TUI component.
4. Add tests in `source/__tests__/operations/newOperation.test.ts` — mock `exec`/`execFile` to verify correct commands.
