# Key Abstractions

> Part of the [architecture guide](../../architecture.md). Read this when changing the stack/feature
> config model, the operations layer, or shell execution.

## Stack (`source/stacks/`)

Each stack owns a module — `source/stacks/evm.ts` and `source/stacks/canton.ts` — exporting one `StackConfig`. `source/stacks/index.ts` holds the `stackDefinitions` record, `stackNames`, and the accessors below. The types live in `source/types/types.ts`. Nothing outside `source/stacks/` and `cli.tsx` tests a stack by name.

```ts
type Stack = 'evm' | 'canton'

type StackConfig = {
  label: string
  description: string
  repoUrl: string
  ref?: string                              // tag or branch to clone; left out, the newest tag wins
  packageManager: 'pnpm'
  minNodeVersion?: string                   // checked before the clone (Canton: 24.15.0)
  prepare?: PrepareStep                     // paths and package.json keys every scaffold drops
  postInstall?: string[]                    // stack-level post-install guidance, shown for every scaffold
  postInstallComponent?: () => Promise<{ default: FC<PostInstallProps> }>  // richer wizard closing screen (EVM), imported on demand so --info and the non-interactive path never load Ink; otherwise the lines above are printed
  staging?: { label: string; paths: string[] }  // where the template keeps replacement files; removed once cleanup is done (EVM's .install-files)
  initialCommit?: boolean                   // commit the finished scaffold as the project's baseline (Canton)
  envFiles: Array<{ from: string; to: string }>
  features: Record<string, FeatureDefinition>
}

type PrepareStep = {
  label: string
  paths?: string[]            // deleted before the install
  scripts?: string[]          // package.json scripts deleted before the install
  devDependencies?: string[]  // package.json devDependencies deleted before the install
}
```

`prepare` is what a scaffold drops whatever the user picked. EVM uses it for the template's own repo files (`.github`, `.claude`, the agent docs). Canton uses it for the bulk of its scaffolding: the three in-tree libraries, `kit/`, the agent docs and `pnpm-lock.yaml`, plus the seven `package.json` scripts that ran `kit/` and the `typedoc`, `postcss` and `@mermaid-js/mermaid-cli` dev-dependencies that only served them. Both halves must go together, because knip counts a binary named in a script as used. It runs inside `cleanupFiles`, before the single package install, so the package manager never resolves a dependency the manifest is about to lose.

Installation modes are stack-aware via `getInstallationModes(stack)` — EVM offers `full` / `custom`, Canton offers none. A stack with no features returns an empty list: the wizard skips both questions and the CLI rejects `--mode` and `--features`. `default` mode needs at least one `default: false` feature, or it would equal `full`; no stack has one today.

`getStackConfig(stack)` reads the base config and overlays the env-var overrides `DAPPBOOSTER_<STACK>_REPO_URL` and `DAPPBOOSTER_<STACK>_REF` before returning — that's the single hook for retargeting either stack at a fork or pre-release branch without editing code.

`getFeatureNames(stack)`, `getFeatureEntries(stack)` and `isFeatureNameValid(stack, name)` are the per-stack feature accessors. There is no global `featureDefinitions` export — that would imply a single stack.

`FeatureName` is the union of every feature name the stacks define, declared in `source/types/types.ts`. Only EVM has features, and its `satisfies StackConfig & { features: Record<FeatureName, FeatureDefinition> }` clause requires its feature map to hold exactly those keys, so the union and the map cannot drift apart without a compile error. Renaming a feature therefore turns every stale `'oldName'` string in the codebase into a compile error. `isFeatureNameValid` is a type guard, so validated CLI input narrows from `string` to `FeatureName`.

## Feature Definitions

Stored inside each stack's `features` map. Shape:

```ts
type FeatureDefinition = {
  description: string   // --info output
  label: string         // TUI multiselect display
  packages: string[]    // dependencies the package manager removes when the feature is deselected
  default: boolean      // --info output
  postInstall?: string[] // post-install instructions for non-interactive JSON output
  paths?: string[]       // files/dirs removed when the feature is deselected
  scripts?: string[]     // package.json scripts removed when the feature is deselected
  requires?: FeatureName[] // features this one depends on (one-directional, transitive)
}
```

When adding a new feature, add its name to the `FeatureName` union in `source/types/types.ts` and an entry to the stack's `features` map. Programmatic consumers pick it up automatically. Feature cleanup is data-driven from `paths` and `scripts`, and removal of its `packages` is data-driven too (see the Operations Layer below), so a new feature usually needs no code. The one exception is EVM's `demo` and `subgraph`, which restore replacement source files from the template's staging directory. The CLI `--help` text in `cli.tsx` maintains its own copy either way.

`packages` are always removed by the package manager (`pnpm remove`), which updates package.json and the lockfile together. Nothing hand-edits dependencies.

**Feature dependencies (`requires`)** are resolved by pure helpers in `utils.ts`. `resolveSelectedFeatures(stack, selected)` expands a selection to include every transitive requirement; `resolveModeFeatures(stack, mode, customSelection)` maps a mode to its kept-feature list (full → all, default → the `default: true` set, custom → the resolved selection), each with its `requires` resolved. The non-interactive path resolves it in `validate`; the interactive path resolves it once in `app.tsx` and passes the result to every step, so the review screen lists exactly what gets installed. `applyFeatureToggle(stack, selection, toggled, action)` keeps the interactive multiselect consistent: selecting a feature pulls its requirements in, deselecting one cascades its dependents out. No feature declares `requires` today (the machinery remains for future use); `--info` surfaces each feature's `requires` so agents can resolve dependencies themselves.

## Operations Layer (`source/operations/`)

Plain async functions, no UI dependencies. Each operation that varies per stack takes `stack: Stack` as its first argument. Multi-step operations accept an optional `onProgress` callback for the TUI; the non-interactive path omits it.

| Function | What it does |
|---|---|
| `cloneRepo(stack, projectName, onProgress?)` | Fails first when the running Node is below `stack.minNodeVersion`, before anything touches the disk. Then clones. Without `stack.ref` (both stacks today): shallow clone with `--no-checkout`, `git fetch --tags`, then `git checkout $(git describe --tags …)` (shell required for `$()`). With `stack.ref` — which today only `DAPPBOOSTER_<STACK>_REF` sets — that tag or branch wins over the latest tag: `git fetch --depth 1 origin <ref>` then `git checkout FETCH_HEAD`, no shell. Removes `.git` and reinitializes with `git init`. Uses `execFile` everywhere except the latest-tag shell substitution. |
| `createEnvFile(stack, projectFolder)` | Copies every entry from `stack.envFiles`. |
| `installPackages(stack, projectFolder, mode, features, onProgress?)` | Uses `stack.packageManager`. Nothing to remove (full mode, or a selection that drops no packages): `<pm> install`. Otherwise `<pm> remove`, which prunes the manifest and the lockfile together, then `<pm> run postinstall` **only if the template defines that script** — the Canton template does not. Runs after `cleanupFiles`, so it resolves the pruned manifest once. `execFile` only — never shell. |
| `cleanupFiles(stack, projectFolder, mode, features, onProgress?)` | Config-driven for both stacks, and runs **before** the install. First the stack's `prepare` paths, dropped from every scaffold. Then, in `default` and `custom` modes, it loops the stack's features and for each one the user left out removes its `paths` and collects its `scripts`. Removed **directories** also strip scripts by command target: any script whose command invokes a removed directory is dropped, so dropping `vocs` strips a script that runs `docs/`. Removed *files* never strip scripts, so a script that merely mentions `CLAUDE.md` survives. package.json is then patched in a single pass — the `prepare` scripts and dev-dependencies, plus the deselected features' scripts — read once and written only when a value changed. Feature dependencies are left to `installPackages`; `prepare` dev-dependencies are deleted here, because the package manager must never see them. A stack with a `staging` group additionally restores the demo-free home page from the staged copies when `demo` or `subgraph` is dropped, and the staging directory (EVM's `.install-files`) goes last, once the restores no longer need it. |

### Interrupt safety (`installGuard`)

`source/operations/installGuard.ts` makes a Ctrl+C or a failure mid-scaffold leave no partial directory behind. `beginInstall(projectFolder)` is called the instant disk work starts (before `cloneRepo`) and registers `SIGINT`/`SIGTERM` handlers; `completeInstall()` is called once cleanup finishes; `abortInstall()` is called when an operation throws — it removes the partial directory and sets `process.exitCode = 1`, so a failed interactive run reports failure to the shell instead of exiting 0. The three interactive operation steps (`CloneRepo`, `Install`, `FileCleanup`) all call it from their `catch`. On an interrupt while a scaffold is in progress, the handler removes the project directory; after `completeInstall` it is a no-op, so a finished project (or a Ctrl+C on the post-install screen) is never deleted. It only ever removes a directory created this run — both entry paths reject a pre-existing directory up front — so user data is never touched. Both paths wire it in: the non-interactive runner brackets its operation block, and interactively `CloneRepo` calls `beginInstall` while `Install`, the last operation step, calls `completeInstall`.

## Shell Execution (`source/operations/exec.ts`)

Two helpers with different security profiles:

- **`execFile(file, args, options)`** — wraps `child_process.spawn` without a shell. Arguments are passed as an array, so user input cannot be interpreted as shell metacharacters. Use this whenever user-provided values (e.g., `projectName`) appear in the command.
- **`exec(command, options)`** — wraps `child_process.spawn` to run `/bin/sh -c <command>` (spawns a shell). Only for commands that require shell features like `$(...)` substitution. Never interpolate user input into the command string.

Both helpers use `spawn` with stdout ignored and stderr piped. They do not capture or return stdout — output is not buffered for the caller. They throw on non-zero exit codes with the stderr message, or report the signal name when the process is killed by a signal.

## Security

- User input (`projectName`) is validated against `/^[a-zA-Z0-9_]+$/` before any use.
- Operations use `execFile` (no shell) for commands that include user input or stack-config values.
- `exec` (shell) is reserved for the tag-latest checkout (`git checkout $(git describe …)`); it never receives user input in the command string.
- Stack `repoUrl` and `ref` may come from the environment (`DAPPBOOSTER_<STACK>_REPO_URL`, `DAPPBOOSTER_<STACK>_REF`) but are passed to git via `execFile`, not interpolated into shell strings.
- Child process stdout is ignored and stderr is piped (captured for error diagnostics only), guaranteeing clean JSON on the parent's stdout.
