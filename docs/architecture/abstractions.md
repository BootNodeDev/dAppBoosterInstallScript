# Key Abstractions

> Part of the [architecture guide](../../architecture.md). Read this when changing the stack/feature
> config model, the operations layer, or shell execution.

## Stack (`source/constants/config.ts`)

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
  postInstall?: string[]                    // stack-level post-install guidance, shown for every scaffold (Canton run steps)
  envFiles: Array<{ from: string; to: string; ifFeature?: string }>
  features: Record<string, FeatureDefinition>
}
```

Installation modes are stack-aware via `getInstallationModes(stack)` — Canton offers `default` / `full` / `custom`, EVM offers `full` / `custom`. The `default: boolean` flag on a feature has two roles: it pre-checks the feature in the custom multiselect **and** defines membership in `default` mode (`getDefaultFeatureNames(stack)` = the `default: true` set). `default` mode is Canton-only because EVM has no `default: false` features (there it would equal `full`).

`getStackConfig(stack)` reads the base config and overlays the env-var overrides `DAPPBOOSTER_<STACK>_REPO_URL` and `DAPPBOOSTER_<STACK>_REF` before returning — that's the single hook for retargeting either stack at a fork or pre-release branch without editing code.

`getFeatureNames(stack)`, `getFeatureEntries(stack)` and `isFeatureNameValid(stack, name)` are the per-stack feature accessors. There is no global `featureDefinitions` export — that would imply a single stack.

`FeatureName` is derived from `stackDefinitions` (which is declared with `satisfies`, so the literal keys survive), giving the union of every feature name both stacks define. Renaming a feature in the map turns every stale `'oldName'` string in the codebase into a compile error. `isFeatureNameValid` is a type guard, so validated CLI input narrows from `string` to `FeatureName`. The type is deliberately not per-stack: passing an EVM feature name to a Canton call still compiles, and the runtime check in `nonInteractive.ts` catches it.

## Feature Definitions

Stored inside each stack's `features` map. Shape:

```ts
type FeatureDefinition = {
  description: string   // --info output
  label: string         // TUI multiselect display
  packages: string[]    // package-manager packages to remove when deselected (empty for canton features today)
  default: boolean      // --info output
  postInstall?: string[] // post-install instructions for non-interactive JSON output
  paths?: string[]       // files/dirs removed when the feature is deselected
  scripts?: string[]     // package.json scripts removed when the feature is deselected
  dependencies?: string[] // deps deleted straight from package.json (the package manager is not asked to uninstall them)
  requires?: string[]    // features this one depends on (one-directional, transitive)
}
```

When adding a new feature, add it to the relevant stack's `features` map. Programmatic consumers pick it up automatically. Feature cleanup is data-driven from `paths`, `scripts` and `dependencies` for both stacks (see the Operations Layer below), so a new feature usually needs no cleanup code. The two exceptions are EVM's `demo` and `subgraph`, which restore replacement source files from the template's `.install-files` directory. The CLI `--help` text in `cli.tsx` maintains its own copy in both cases.

`packages` and `dependencies` differ in who removes them. `packages` are handed to the package manager (`pnpm remove` / `npm uninstall`), which updates package.json and the lockfile together. `dependencies` are deleted from package.json by cleanup, which then rewrites the lockfile itself. Canton uses the second form because its template has no `postinstall` script for the package manager's remove path to run.

**Feature dependencies (`requires`)** are resolved by pure helpers in `utils.ts`. `resolveSelectedFeatures(stack, selected)` expands a selection to include every transitive requirement; `resolveModeFeatures(stack, mode, customSelection)` maps a mode to its kept-feature list (full → all, default → the `default: true` set, custom → the resolved selection) and is shared by the non-interactive path and the interactive Install/FileCleanup/PostInstall steps. `applyFeatureToggle(stack, selection, toggled, action)` keeps the interactive multiselect consistent: selecting a feature pulls its requirements in, deselecting one cascades its dependents out. No feature declares `requires` today (the machinery remains for future use); `--info` surfaces each feature's `requires` so agents can resolve dependencies themselves.

## Operations Layer (`source/operations/`)

Plain async functions, no UI dependencies. Each operation that varies per stack takes `stack: Stack` as its first argument. Multi-step operations accept an optional `onProgress` callback for the TUI; the non-interactive path omits it.

| Function | What it does |
|---|---|
| `cloneRepo(stack, projectName, onProgress?)` | Reads `stack.refType`. **tag-latest**: shallow clone with `--no-checkout`, `git fetch --tags`, then `git checkout $(git describe --tags …)` (shell required for `$()`). **branch**: shallow clone with `--branch <stack.ref> --single-branch` (no shell). After that, runs `fs.rm` for every entry in `stack.removeAfterClone` (empty for both stacks today), removes `.git`, and reinitializes with `git init`. Uses `execFile` everywhere except the tag-latest shell substitution. |
| `createEnvFile(stack, projectFolder, features?)` | Copies every entry from `stack.envFiles`. Entries with `ifFeature` are skipped unless the named feature is in the selection (e.g. Canton's `carpincho-wallet/.env.local` only when `carpincho` is selected). |
| `installPackages(stack, projectFolder, mode, features, onProgress?)` | Uses `stack.packageManager`. Full: `<pm> install`. `default`/`custom` with packages to remove: `<pm> remove` (pnpm) or `<pm> uninstall` (npm) + `<pm> run postinstall`; with nothing to remove: `<pm> install`. Canton features all carry `packages: []`, so Canton always runs a plain `npm install` (husky-dep removal happens in cleanup, not here — the Canton template has no `postinstall` script). `execFile` only — never shell. |
| `cleanupFiles(stack, projectFolder, mode, features, onProgress?)` | **EVM** starts with the hygiene it always applies: `.github` (the template's CI) and its own agent metadata (`.claude`, `AGENTS.md`, `CLAUDE.md`, `architecture.md`). It then restores the replacement home page from `.install-files` when `demo` or `subgraph` is deselected, and finally deletes the `.install-files` staging directory. **Canton** applies no forced hygiene — `.github` and the pre-commit automation are its optional `github` and `precommit` features. Everything else is **data-driven for both stacks**: in `default` and `custom` modes (not `full`) it loops the stack's features and, for each one the user left out, removes its `paths` and collects its `scripts` and `dependencies`. Removed **directories** then drive two more `package.json` edits: **script stripping** by command target — any script whose command invokes a removed directory is dropped, so deselecting `carpincho` strips `wallet:dev` and `carpincho:build:extension` — and **`workspaces` pruning**, dropping any workspace entry pointing at a removed directory (both the `string[]` and `{ packages: string[] }` forms). Removed files never strip scripts, so a script that merely mentions `CLAUDE.md` survives. package.json is read once and written only when something changed. When the dependencies or the workspaces list changed, the lockfile is rewritten from the new manifest (`npm install --package-lock-only` / `pnpm install --lockfile-only`); a failure there is reported through `onProgress` and does not fail the scaffold. In `full` mode nothing is removed, so a full scaffold keeps every feature. Canton then makes an initial `git` commit of the scaffold. |

### Interrupt safety (`installGuard`)

`source/operations/installGuard.ts` makes a Ctrl+C or a failure mid-scaffold leave no partial directory behind. `beginInstall(projectFolder)` is called the instant disk work starts (before `cloneRepo`) and registers `SIGINT`/`SIGTERM` handlers; `completeInstall()` is called once cleanup finishes; `abortInstall()` is called when an operation throws — it removes the partial directory and sets `process.exitCode = 1`, so a failed interactive run reports failure to the shell instead of exiting 0. The three interactive operation steps (`CloneRepo`, `Install`, `FileCleanup`) all call it from their `catch`. On an interrupt while a scaffold is in progress, the handler removes the project directory; after `completeInstall` it is a no-op, so a finished project (or a Ctrl+C on the post-install screen) is never deleted. It only ever removes a directory created this run — both entry paths reject a pre-existing directory up front — so user data is never touched. Both paths wire it in: the non-interactive runner brackets its operation block, and interactively `CloneRepo` calls `beginInstall` while `FileCleanup` calls `completeInstall`.

## Shell Execution (`source/operations/exec.ts`)

Two helpers with different security profiles:

- **`execFile(file, args, options)`** — wraps `child_process.spawn` without a shell. Arguments are passed as an array, so user input cannot be interpreted as shell metacharacters. Use this whenever user-provided values (e.g., `projectName`) appear in the command.
- **`exec(command, options)`** — wraps `child_process.spawn` to run `/bin/sh -c <command>` (spawns a shell). Only for commands that require shell features like `$(...)` substitution. Never interpolate user input into the command string.

Both helpers use `spawn` with stdout ignored and stderr piped. They do not capture or return stdout — output is not buffered for the caller. They throw on non-zero exit codes with the stderr message, or report the signal name when the process is killed by a signal.

## Security

- User input (`projectName`) is validated against `/^[a-zA-Z0-9_]+$/` before any use.
- Operations use `execFile` (no shell) for commands that include user input or stack-config values.
- `exec` (shell) is reserved for the EVM tag-latest checkout (`git checkout $(git describe …)`); it never receives user input in the command string.
- Stack `repoUrl` and `ref` may come from the environment (`DAPPBOOSTER_<STACK>_REPO_URL`, `DAPPBOOSTER_<STACK>_REF`) but are passed to git via `execFile`, not interpolated into shell strings.
- Child process stdout is ignored and stderr is piped (captured for error diagnostics only), guaranteeing clean JSON on the parent's stdout.
