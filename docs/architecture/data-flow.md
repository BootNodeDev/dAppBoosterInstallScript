# Data Flow

> Part of the [architecture guide](../../architecture.md). Read this when changing CLI routing,
> non-interactive validation/execution order, or the interactive step sequence.

## Non-interactive (agent)

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

Custom-mode selections are then expanded with `resolveSelectedFeatures` (see
[abstractions](./abstractions.md#feature-definitions)), so feature dependencies are pulled in
before the operations run and before the result is reported.

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

For full mode, `features` lists all of the stack's feature names. For custom mode, the selected ones plus any dependencies they pulled in.

## Interactive (human)

```
User input via Ink components
  → useState in App.tsx (stack, projectName, setupType, selectedFeatures)
  → passed as props to step components
  → components convert MultiSelectItem[] → FeatureName[]
  → operations receive typed args (stack first)
  → Ink renders progress/status
```

All questions come **before** any disk work, mirroring the non-interactive path — so abandoning the wizard while answering leaves nothing behind.

```
Questions (no disk):  ProjectName → [StackSelection] → InstallationMode → OptionalPackages (custom only) → Confirmation
Operations (disk):    CloneRepo → Install → FileCleanup → PostInstall
```

`Confirmation` shows a one-line plan summary (`describeInstallPlan`) and is the last side-effect-free step. **Yes** starts the operations; **No** loops back to the first question (state is reset and the question steps are re-keyed so they re-mount fresh). When `cli.tsx` resolves a stack flag, it passes `preselectedStack` to `<App>`, which skips the `StackSelection` step.

Once operations begin, `CloneRepo` calls `beginInstall` (see [abstractions → installGuard](./abstractions.md#interrupt-safety-installguard)) and `FileCleanup` calls `completeInstall` on success, so a Ctrl+C mid-scaffold removes the partial directory while a finished project is left intact.

Components are presentation-only — they call operations via `useEffect` and render status. Components receive `MultiSelectItem[]` for feature selection (TUI concern) and convert to `FeatureName[]` before calling operations. The `OptionalPackages` multiselect enforces feature dependencies live via `applyFeatureToggle`. `PostInstall` renders stack-specific instructions; the EVM branch shows the subgraph warning when applicable, the Canton branch shows the `canton:up`/`app:dev` commands and — when the `carpincho` feature is selected (or full mode) — the Carpincho extension build/load instructions.
