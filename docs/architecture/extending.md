# Extending the Installer

> Part of the [architecture guide](../../architecture.md). Read this when adding a stack, a feature,
> or an operation.

## How to Add a New Stack

1. **`source/types/types.ts`** — add a `Stack` union member.
2. **`source/stacks/<name>.ts`** — export a `StackConfig`: `label`, `description`, `repoUrl`, optional `ref`, `packageManager`, `envFiles`, `features`. Add `minNodeVersion` when the scaffold needs a newer Node than the installer, `prepare` for what every scaffold drops, `staging` for replacement files, and `initialCommit` for a baseline commit. `cleanupFiles` and `cloneRepo` read all of it, so they need no new branch.
3. **`source/stacks/index.ts`** — add the module to the `stackDefinitions` record.
4. **Post-install** — a stack with a short message needs nothing: `PostInstall.tsx` prints its `postInstall` lines. For a richer screen, add a component and set `postInstallComponent` to a function that imports it (`() => import('../components/steps/MyPostInstall.js')`), so the stack config stays free of terminal UI.
5. **`source/cli.tsx`** — add a shortcut flag (e.g. `--myStack`) and extend `resolveStackFlag`; update `--help` text.
6. **Tests** — add per-stack assertions to `nonInteractive.test.ts`, `info.test.ts`, `cloneRepo.test.ts`, `installPackages.test.ts`, `cleanupFiles.test.ts`, `createEnvFile.test.ts`.
7. **Verify** — `pnpm build && pnpm lint && pnpm test`. Smoke-test with `DAPPBOOSTER_<STACK>_REPO_URL=file:///path/to/local/clone`.

## How to Add a New Feature to an Existing Stack

1. **`source/types/types.ts`** — add the name to the `FeatureName` union.
2. **`source/stacks/<name>.ts`** — add an entry to the stack's `features` map (leave one out and the file will not compile). The `default` flag governs both the custom-mode pre-check and `default`-mode membership: `default: true` for "kept by the recommended install", `default: false` for "removed by default / opt-in". List the feature's `paths`, `scripts` and `packages`; cleanup and the install read all three, so no new code is needed. If it depends on another feature, add `requires` — resolution is automatic in both paths.
3. **`source/operations/cleanupFiles.ts`** — only needed when the feature has to put a replacement file back, the way EVM's `demo` and `subgraph` copy from `.install-files`.
4. **Post-install** — extend the stack's `postInstall` lines or its `postInstallComponent` if needed.
5. **`source/cli.tsx`** — update the `--help` text.
6. **Tests** — add assertions in the relevant test files. nonInteractive, info, installPackages, and utils tests pick up new features automatically through `stackDefinitions`.
7. **Verify** — `pnpm build && pnpm lint && pnpm test`.

> Adding the first feature to a stack that had none also turns its wizard questions and its `--mode` / `--features` flags back on, because `getInstallationModes` stops returning an empty list.

## How to Add a New Operation

1. Create `source/operations/newOperation.ts` — export an async function. Use `execFile` for commands with user input, `exec` only when shell features are needed. If behavior depends on the stack, take `stack: Stack` as the first argument.
2. Export from `source/operations/index.ts`.
3. Call from `source/nonInteractive.ts` (in the execution sequence) and from the relevant TUI component.
4. Add tests in `source/__tests__/operations/newOperation.test.ts` — mock `exec`/`execFile` to verify correct commands.
