# Architecture overview

Architecture guide for the dAppBooster installer.

## Tech stack

| Category | Technology | Notes |
|----------|-----------|-------|
| Framework | React + Ink | Terminal UI for interactive mode |
| Language | TypeScript (strict mode) | Extends `@sindresorhus/tsconfig`. `tsconfig.json` builds `source/`; `tsconfig.tests.json` typechecks the tests |
| Arg parsing | meow | CLI flag parsing, non-interactive mode |
| Styling | Ink primitives | `<Box>`, `<Text>`, ink-gradient, ink-big-text, ink-spinner |
| Testing | Vitest + @vitest/coverage-v8 | |
| Lint + format | Biome 2 | `biome.json`; one tool for both |
| Dead code | knip | `knip.json`; the entry points are `cli.tsx` and the test files |
| Node | v24.15.0+ published, 24 for development | `engines.node` is the floor, matched to what dAppBooster needs; CI uses `.nvmrc` |

## Project structure

```
source/
  cli.tsx                     Entry point: meow arg parsing, mode routing
  app.tsx                     Interactive TUI: step-based state machine
  nonInteractive.ts           Non-interactive: validate flags → run operations → JSON
  info.ts                     --info JSON output for agent discovery
  config.ts                   Feature definitions, prepare and staging paths, the repository to clone, the package manager
  operations/
    exec.ts                   exec (shell) and execFile (no shell) helpers
    cloneRepo.ts              Check pnpm, clone at the newest tag or at DAPPBOOSTER_REF, rm .git, git init
    createEnvFile.ts          Copy .env.example to .env.local
    installPackages.ts        pnpm install, or pnpm remove for the features left out
    cleanupFiles.ts           Removes the prepare paths and the features left out, patches package.json, all before the install
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
  __tests__/                  Mirrors the source/ layout
```

## Key abstractions

### Config (`source/config.ts`)

Everything the installer knows about the dAppBooster template:

- `featureDefinitions`: one entry per optional feature. `featureEntries`, `featureNames` and `defaultFeatureNames` come from it.
- `isFeatureNameValid(name)`: a type guard, so validated CLI input narrows from `string` to `FeatureName`.
- `prepare`: paths every scaffold drops, whatever the user picked. These are the template's own repo files (`.github`, `.claude`, the agent docs).
- `staging`: the template's `.install-files` directory, which holds the replacement files a deselected feature restores. Cleanup removes it last.
- `getRepo()`: the repository URL and an optional `ref`. Without a `ref`, the installer clones the newest tag. The env vars `DAPPBOOSTER_REPO_URL` and `DAPPBOOSTER_REF` override both, for forks and pre-release testing.
- `packageManager`: `'pnpm'`, the package manager `cloneRepo` checks for and `installPackages` runs.

`FeatureName` is the union of every feature name, declared in `source/types/types.ts`. `featureDefinitions` has the type `Record<FeatureName, FeatureDefinition>`, so the union and the map cannot drift apart without a compile error. Renaming a feature therefore turns every stale `'oldName'` string in the codebase into a compile error.

Installation modes are `full` (keep every feature) and `custom` (pick them).

### Feature definitions

Shape:

```ts
type FeatureDefinition = {
  description: string    // --info output
  label: string          // TUI multiselect display
  packages: string[]     // dependencies the package manager removes when the feature is deselected
  default: boolean       // --info output, and pre-checked in the multiselect
  postInstall?: string[] // post-install steps for the JSON output; the wizard also prints subgraph's
  paths?: string[]       // files/dirs removed when the feature is deselected
  scripts?: string[]     // package.json scripts removed when the feature is deselected
}
```

To add a new feature, add its name to the `FeatureName` union in `source/types/types.ts` and an entry to `featureDefinitions`. Programmatic consumers pick it up on their own. Feature cleanup reads `paths` and `scripts`, and the install reads `packages` (see the operations layer below), so a new feature usually needs no code. The one exception is `demo` and `subgraph`, which restore replacement source files from `.install-files`. The CLI `--help` text in `cli.tsx` keeps its own copy either way.

The package manager always removes `packages` (`pnpm remove`), which updates package.json and the lockfile together. Nothing edits dependencies by hand.

`resolveModeFeatures(mode, customSelection)` in `utils.ts` maps a mode to its kept features, in config order. Full mode keeps all of them, and custom mode keeps the selection. The non-interactive path resolves it in `validate`. The interactive path resolves it once in `app.tsx` and passes the result to every step, so the review screen lists exactly what gets installed.

### Operations layer (`source/operations/`)

Plain async functions, with no UI dependencies. Multi-step operations accept an optional `onProgress` callback for the TUI; the non-interactive path leaves it out.

| Function | What it does |
|---|---|
| `cloneRepo(projectName, onProgress?)` | Fails first when `pnpm` is not installed, before anything touches the disk. Then it clones. Without a `ref`, it runs a shallow clone with `--no-checkout`, then `git fetch --tags`, then `git checkout $(git describe --tags …)`, which needs a shell for `$()`. When you set `DAPPBOOSTER_REF`, that tag or branch wins over the latest tag: `git fetch --depth 1 origin <ref>`, then `git checkout FETCH_HEAD`, with no shell. Then it removes `.git` and runs `git init`. It uses `execFile` everywhere except the latest-tag shell substitution. |
| `createEnvFile(projectFolder)` | Copies `.env.example` to `.env.local`. |
| `installPackages(projectFolder, features, onProgress?)` | With no packages to remove, it runs `pnpm install`. Otherwise it runs `pnpm remove`, which prunes the manifest and the lockfile together, then `pnpm run --if-present postinstall`. It runs after `cleanupFiles`, so it resolves the pruned manifest once. It uses `execFile` only, never a shell. |
| `cleanupFiles(projectFolder, features, onProgress?)` | Reads the config and runs **before** the install. First it removes the `prepare` paths, which every scaffold drops. Then it loops over the features. For each one the user left out, it removes the feature's `paths` and collects its `scripts`. It restores the demo-free home page from `.install-files` when the user drops `demo` or `subgraph`, and removes the collected scripts from package.json in a single pass, writing the file only when a value changed. It leaves feature dependencies to `installPackages`. The staging directory goes last, once the restores no longer need it. |

#### Interrupt safety (`installGuard`)

`source/operations/installGuard.ts` makes sure a Ctrl+C or a failure mid-scaffold leaves no partial directory behind.

- `beginInstall(projectFolder)` runs the moment disk work starts, before `cloneRepo`. It registers the `SIGINT` and `SIGTERM` handlers.
- `completeInstall()` runs once the install finishes.
- `abortInstall()` runs when an operation throws. It removes the partial directory and sets `process.exitCode = 1`, so a failed interactive run reports failure to the shell instead of exiting 0.

The three interactive operation steps (`CloneRepo`, `FileCleanup`, `Install`) all call `abortInstall` through `StepProgress`. On an interrupt during a scaffold, the handler removes the project directory. After `completeInstall` it does nothing, so it never deletes a finished project, even on a Ctrl+C on the post-install screen. It only removes a directory this run created, because both entry paths reject a directory that already exists. It never touches user data.

Both paths use it. The non-interactive runner wraps its operations with it. In the wizard, `CloneRepo` calls `beginInstall`, and `Install`, the last operation step, calls `completeInstall`.

### Shell execution (`source/operations/exec.ts`)

Two helpers with different security profiles:

- **`execFile(file, args, options)`** wraps `child_process.spawn` without a shell. It passes the arguments as an array, so the shell never reads user input as metacharacters. Use it whenever a user-provided value, such as `projectName`, appears in the command.
- **`exec(command, options)`** wraps `child_process.spawn` to run `/bin/sh -c <command>`, which starts a shell. Use it only for commands that need shell features like `$(...)` substitution. Never interpolate user input into the command string.

Both helpers call `spawn` with stdout ignored and stderr piped. They do not capture or return stdout, and they buffer no output for the caller. On a non-zero exit code they throw with the stderr message, or with the signal name when a signal kills the process.

### Security

- The installer validates user input (`projectName`) against `/^[a-zA-Z0-9_][a-zA-Z0-9_-]*$/` before any use. The first character cannot be a dash, or git would read the name as an option rather than a directory.
- Operations use `execFile` (no shell) for commands that include user input or config values.
- Only the latest-tag checkout (`git checkout $(git describe …)`) uses `exec` (shell), and its command string never includes user input.
- The repository URL and ref may come from the environment (`DAPPBOOSTER_REPO_URL`, `DAPPBOOSTER_REF`). `execFile` passes them to git as arguments, never inside a shell string.
- The helpers ignore child process stdout and pipe stderr, which they keep only for error messages. That keeps the parent's stdout clean for JSON.

## Data flow

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
unknown flag  →  JSON error → exit 1
--info  →  source/info.ts → print JSON → exit 0
--ni / !isTTY  →  source/nonInteractive.ts → validate → operations → JSON
default  →  dynamic import ink + App → TUI
```

**Non-interactive validation order:**
1. `--name` must be present
2. `--name` matches `/^[a-zA-Z0-9_][a-zA-Z0-9_-]*$/`. A leading dash fails, because git would read the name as an option
3. `--mode` must be present
4. `--mode` is `full` or `custom`
5. Full mode: skip to step 7 (it keeps every feature and ignores `--features`)
6. Custom mode: `--features` must be present, must parse to a non-empty list (it rejects trailing commas and whitespace-only entries), and every name must be valid
7. The project directory must not already exist

**Non-interactive execution order:**
`cloneRepo`, then `cleanupFiles`, then `createEnvFile`, then `installPackages`, then the success JSON.

Cleanup runs **before** the install on purpose. It prunes package.json, so the package manager resolves the pruned manifest once and writes a lockfile that matches. The reverse order left the generated project with a lockfile listing packages its package.json no longer had, which fails a frozen-lockfile install.

Any error produces `{ "success": false, "error": "..." }` and exit code 1. `reportFailure` is the only place that prints it. It sets `process.exitCode = 1` and returns a `ReportedError`, which `fail()` throws. `cli.tsx` ignores that error type and reports anything else. Nothing calls `process.exit()` directly, so stdout flushes before the process ends when piped.

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

In full mode, `features` lists every feature name. In custom mode it lists the selected ones, in config order.

### Interactive (human)

```
User input via Ink components
  → useState in App.tsx (projectName, setupType, selectedFeatures)
  → passed as props to step components
  → components convert MultiSelectItem[] → FeatureName[]
  → operations receive typed args
  → Ink renders progress/status
```

All questions come **before** any disk work, as in the non-interactive path. Leaving the wizard while answering leaves nothing behind.

```
Questions (no disk):  ProjectName → InstallationMode → OptionalPackages (custom only) → Confirmation
Operations (disk):    CloneRepo → FileCleanup → Install → PostInstall
```

Each operation step renders through the shared `StepProgress` component. It owns the step list, the running, done and error display, and the failure path (`abortInstall`), so every step reports a failure the same way. `Install` covers the env file and the package install, and calls `completeInstall` when the scaffold finishes.

`Confirmation` shows the plan as one line per setting (`describeInstallPlan`), each value highlighted. It is the last step with no side effects. **Yes** starts the operations. **No** goes back to the first question: the wizard resets its state and re-keys the question steps so they mount fresh.

Components are presentation-only. They call operations from `useEffect` and render the status. They receive `MultiSelectItem[]` for the feature selection, a TUI concern, then derive the kept `FeatureName[]` with `resolveModeFeatures(mode, selected)` before calling operations. That way `full` mode resolves correctly even though the wizard skips the multiselect. The `OptionalPackages` multiselect pre-checks the `default: true` features. When the user keeps the subgraph feature, `PostInstall` adds a warning that lists the steps from its `postInstall` lines.

## Extending the installer

### How to add a new feature

1. **`source/types/types.ts`**: add the name to the `FeatureName` union.
2. **`source/config.ts`**: add an entry to `featureDefinitions`. Leave one out and the file does not compile. `default: true` pre-checks the feature in the custom-mode multiselect. List the feature's `paths`, `scripts` and `packages`. Cleanup and the install read all three, so you need no new code.
3. **`source/operations/cleanupFiles.ts`**: only needed when the feature has to put a replacement file back, the way `demo` and `subgraph` copy from `.install-files`.
4. **Post-install**: add `postInstall` lines for the JSON output, and extend `PostInstall.tsx` if the wizard needs to say more.
5. **`source/cli.tsx`**: update the `--help` text.
6. **Tests**: add assertions in the relevant test files. The nonInteractive, info, installPackages, and utils tests pick up new features from `featureDefinitions`.
7. **Verify**: `pnpm build && pnpm lint && pnpm test`.

### How to add a new operation

1. Create `source/operations/newOperation.ts` and export an async function from it. Use `execFile` for commands with user input, and `exec` only when you need shell features.
2. Export it from `source/operations/index.ts`.
3. Call it from `source/nonInteractive.ts`, in the execution sequence, and from the relevant TUI component.
4. Add tests in `source/__tests__/operations/newOperation.test.ts`. Mock `exec` and `execFile` to check the commands.
