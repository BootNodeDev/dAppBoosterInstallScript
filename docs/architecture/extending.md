# Extending the Installer

> Part of the [architecture guide](../../architecture.md). Read this when adding a stack, a feature,
> or an operation.

## How to Add a New Stack

1. **`source/constants/config.ts`** — add a `Stack` union member and a `stackDefinitions` entry: `label`, `description`, `repoUrl`, `refType`, optional `ref`, `packageManager`, `removeAfterClone`, `envFiles`, `features`.
2. **`source/operations/cleanupFiles.ts`** — add a `cleanupXxxFiles` function and route to it from the top-level `cleanupFiles` dispatcher.
3. **`source/components/steps/PostInstall.tsx`** — add stack-specific post-install JSX.
4. **`source/cli.tsx`** — add a shortcut flag (e.g. `--myStack`) and extend `resolveStackFlag`; update `--help` text.
5. **Tests** — add per-stack assertions to `nonInteractive.test.ts`, `info.test.ts`, `cloneRepo.test.ts`, `installPackages.test.ts`, `cleanupFiles.test.ts`, `createEnvFile.test.ts`.
6. **Verify** — `pnpm build && pnpm lint && pnpm test`. Smoke-test with `DAPPBOOSTER_<STACK>_REPO_URL=file:///path/to/local/clone`.

## How to Add a New Feature to an Existing Stack

1. **`source/constants/config.ts`** — add an entry to the stack's `features` map. The `default` flag governs both the custom-mode pre-check and `default`-mode membership: set `default: true` for "kept by the recommended install", `default: false` for "removed by default / opt-in" (Canton's `github` and `precommit`). For **Canton**, also list the feature's `paths`: cleanup is data-driven, so no cleanup code is needed and scripts that target a removed directory are stripped automatically. If it ships an env file, add an `ifFeature`-gated `envFiles` entry. If it depends on another feature, add `requires` — resolution is automatic in both the interactive and non-interactive paths.
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
