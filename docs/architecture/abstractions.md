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
  envFiles: Array<{ from: string; to: string; ifFeature?: string }>
  features: Record<string, FeatureDefinition>
}
```

`getStackConfig(stack)` reads the base config and overlays the env-var overrides `DAPPBOOSTER_<STACK>_REPO_URL` and `DAPPBOOSTER_<STACK>_REF` before returning — that's the single hook for retargeting either stack at a fork or pre-release branch without editing code.

`getFeatureNames(stack)` and `isFeatureNameValid(stack, name)` are the per-stack feature accessors. There is no global `featureDefinitions` export — that would imply a single stack.

## Feature Definitions

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

When adding a new feature, add it to the relevant stack's `features` map. Programmatic consumers pick it up automatically. Canton feature cleanup is fully data-driven from `paths` (see the Operations Layer below), so a new Canton feature needs no cleanup code — only its `paths`. EVM features still need an explicit per-feature cleanup function. The CLI `--help` text in `cli.tsx` maintains its own copy in both cases.

**Feature dependencies (`requires`)** are resolved by pure helpers in `utils.ts`. `resolveSelectedFeatures(stack, selected)` expands a selection to include every transitive requirement (used by the non-interactive path, so `--features e2e` yields `[counter, e2e]`). `applyFeatureToggle(stack, selection, toggled, action)` keeps the interactive multiselect consistent: selecting a feature pulls its requirements in, deselecting one cascades its dependents out. `e2e requires counter` is the only dependency today. `--info` surfaces each feature's `requires` so agents can resolve dependencies themselves.

## Operations Layer (`source/operations/`)

Plain async functions, no UI dependencies. Each operation that varies per stack takes `stack: Stack` as its first argument. Multi-step operations accept an optional `onProgress` callback for the TUI; the non-interactive path omits it.

| Function | What it does |
|---|---|
| `cloneRepo(stack, projectName, onProgress?)` | Reads `stack.refType`. **tag-latest**: shallow clone with `--no-checkout`, `git fetch --tags`, then `git checkout $(git describe --tags …)` (shell required for `$()`). **branch**: shallow clone with `--branch <stack.ref> --single-branch` (no shell). After that, runs `fs.rm` for every entry in `stack.removeAfterClone` (empty for both stacks today), removes `.git`, and reinitializes with `git init`. Uses `execFile` everywhere except the tag-latest shell substitution. |
| `createEnvFile(stack, projectFolder, features?)` | Copies every entry from `stack.envFiles`. Entries with `ifFeature` are skipped unless the named feature is in the selection (e.g. Canton's `carpincho-wallet/.env.local` only when `carpincho` is selected). |
| `installPackages(stack, projectFolder, mode, features, onProgress?)` | Uses `stack.packageManager`. Full: `<pm> install`. Custom with packages to remove: `<pm> remove` (pnpm) or `<pm> uninstall` (npm) + `<pm> run postinstall`. Custom with all features: `<pm> install`. `execFile` only — never shell. |
| `cleanupFiles(stack, projectFolder, mode, features, onProgress?)` | First runs **repository hygiene** (every stack/mode): both stacks always remove `.github` (CI) and the husky/commitlint automation (`.husky`, `.lintstagedrc.mjs`, `commitlint.config.js`) and sanitize tooling deps/scripts from `package.json`; **EVM additionally** always removes its own agent metadata (`.claude`, `AGENTS.md`, `CLAUDE.md`, `architecture.md`), whereas **Canton keeps that metadata** under the optional `llm` feature. Then dispatches to `cleanupEvmFiles` or `cleanupCantonFiles`. EVM removes deselected feature files via per-feature functions plus the `.install-files` staging directory, and patches `package.json` by feature name. Canton cleanup is **data-driven**: it loops the stack's features and, in custom mode, removes each deselected feature's `paths` (e.g. `counter/`, `e2e/`, `carpincho-wallet`, the `llm` artifact paths). The removed directories then drive `package.json` script stripping by **command target** — any script whose command invokes a removed directory is dropped (so deselecting `carpincho` strips `wallet:dev` / `carpincho:build:extension`). Command-based matching keeps cleanup correct as the upstream repo renames or adds scripts. In `full` mode no feature paths are removed, so a full Canton scaffold keeps `carpincho-wallet`, the agent docs, and every script. Canton then makes an initial `git` commit of the scaffold. |

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
