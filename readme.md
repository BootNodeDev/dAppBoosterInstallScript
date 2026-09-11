# dAppBooster installer

Agent-friendly installer that scaffolds a Web3 dApp. It supports **two stacks** — pick one per
run, either through the interactive wizard or with a single flag (`--evm` / `--canton`). It works
interactively (a React + Ink TUI) and non-interactively (flag-driven, JSON output) for CI and AI
agents.

- **EVM** — the original [dAppBooster](https://dappbooster.dev/) for Ethereum, Polygon, Base, and
  other EVM chains.
- **Canton** — [dAppBooster for Canton](https://www.dappbooster.cc/): Daml ledger, off-chain
  services.

## Choose your stack

```shell
pnpm dlx dappbooster --evm      # EVM stack
pnpm dlx dappbooster --canton   # Canton stack
```

Omit the flag to be prompted for the stack in the wizard. Jump to the [EVM stack](#evm-stack) or
[Canton stack](#canton-stack) section for the details of each.

## Requirements

- Node >= 22 for the installer. The Canton scaffold needs Node >= 24.15, checked before the clone
- pnpm (used by the installer and by both scaffolded projects)

## Quick start (interactive)

<img src="./demo.svg" width="600" height="355" alt="Terminal recording of the dAppBooster wizard: choosing a stack, naming the project, picking an installation mode, then cloning and installing.">

```shell
pnpm dlx dappbooster
```

The wizard prompts for project name → stack → mode → features → review, then clones, installs,
cleans up, and prints next steps. Everything after the stack is skipped for a stack that has no
features, so Canton asks for the project name and nothing else. Pass `--evm` or `--canton` to skip
the stack prompt.

dAppBooster documentation: https://docs.dappbooster.dev/

## Agents & CI (non-interactive)

Non-interactive mode activates automatically when stdout is not a TTY, or explicitly with `--ni`.
It returns JSON on stdout and a non-zero exit code on error.

Discover stacks and features first, then install:

```shell
pnpm dlx dappbooster --info                  # all stacks + features as JSON
pnpm dlx dappbooster --info --stack canton   # filter to one stack (or --info --canton)
```

Each stack in that output carries a `modes` list. Send one of those. An empty list means the stack
has no optional features: send neither `--mode` nor `--features`, and both are rejected if you do.

| Flag | Purpose |
|---|---|
| `--canton` / `--evm` | Pick the stack (mutually exclusive shortcuts) |
| `--stack <evm\|canton>` | Pick the stack by name (useful when scripting) |
| `--name <name>` | Project directory name (`/^[a-zA-Z0-9_]+$/`) |
| `--mode <full\|custom>` | `full` installs every feature; `custom` needs `--features`. Only for a stack whose `modes` list is not empty |
| `--features <a,b,c>` | Comma-separated feature keys (custom mode only) |
| `--ni` | Force non-interactive mode |

Mixing flags that disagree (`--canton --evm`, or `--canton --stack evm`) is an error. Each stack
accepts only its own feature keys, and validation errors name the stack:

```json
{
  "success": false,
  "error": "Unknown features for stack 'evm': carpincho. Valid features: demo, subgraph, typedoc, vocs, husky"
}
```

Any failure returns `{ "success": false, "error": "..." }` with exit code 1 (e.g. a missing
`--name`).

A successful install prints:

```json
{
  "success": true,
  "stack": "evm|canton",
  "projectName": "...",
  "mode": "full|default|custom",
  "features": ["..."],
  "path": "/absolute/path",
  "postInstall": ["..."]
}
```

## EVM stack

```shell
pnpm dlx dappbooster --evm
```

Interactive (skips the stack prompt) or non-interactive:

```shell
pnpm dlx dappbooster --evm --ni --name my_dapp --mode full
pnpm dlx dappbooster --evm --ni --name my_dapp --mode custom --features demo,subgraph
```

| Feature | Key | Default | Description |
|---|---|---|---|
| Component Demos | `demo` | ✓ | Component demos and example pages |
| Subgraph support | `subgraph` | ✓ | TheGraph subgraph integration |
| Typedoc | `typedoc` | ✓ | TypeDoc API documentation generation |
| Vocs | `vocs` | ✓ | Vocs documentation site |
| Husky | `husky` | ✓ | Git hooks with Husky, lint-staged, and commitlint |

```json
{
  "success": true,
  "stack": "evm",
  "projectName": "my_dapp",
  "mode": "full",
  "features": ["demo", "subgraph", "typedoc", "vocs", "husky"],
  "path": "/absolute/path/to/my_dapp",
  "postInstall": [
    "Provide your own API key for PUBLIC_SUBGRAPHS_API_KEY in .env.local",
    "Run pnpm subgraph-codegen from the project folder"
  ]
}
```

## Canton stack

```shell
pnpm dlx dappbooster --canton
```

Interactive (skips the stack prompt) or non-interactive:

```shell
pnpm dlx dappbooster --canton --ni --name my_canton_dapp
```

The Canton stack has **no optional features**, so the wizard asks for a project name and then
scaffolds — no mode, no feature list, no review step — and `--mode` and `--features` are rejected
with a message saying why. `--info --canton` reports an empty `features` map and an empty `modes`
list.

The scaffold needs **Node 24.15 or later** (the installer itself still runs on Node 22). The
version is checked before the clone, so an older Node fails with a plain message instead of a
confusing install error.

**What gets stripped:**

- **EVM** always removes the CI config (`.github`) and the agent docs (`.claude`, `AGENTS.md`,
  `CLAUDE.md`, `architecture.md`), which belong to the template's own repository. Everything else
  follows your feature selection: deselecting `husky` removes `.husky`, `.lintstagedrc.mjs`,
  `commitlint.config.js`, the `prepare` and `commitlint` scripts, and the matching dependencies.
- **Canton** is almost pure deletion. The three libraries the template develops in-tree
  (`canton-connect/`, `canton-dappbooster/`, `canton-theme/`) go, and with them `kit/`, the agent
  docs, `.github`, `renovate.json`, the root `vercel.json` and `pnpm-lock.yaml`. The scaffold then
  installs `@bootnodedev/canton-connect`, `@bootnodedev/canton-dappbooster` and
  `@bootnodedev/canton-theme` from npm: pnpm links a local library folder only while that folder's
  own version satisfies the declared range, so deleting the folders makes the same `package.json`
  resolve from the registry. No manifest rewrite, no workspace file edit.
- **Canton** also drops the `package.json` keys that pointed at `kit/`: the `docs:build`,
  `docs:check`, `check:anatomy`, `check:versions`, `release`, `release:dry` and `release:version`
  scripts, plus the `typedoc` and `postcss` dev-dependencies. Biome, knip, commitlint, husky,
  gitleaks, the README, `scripts/`, `dapp/daml` and `dapp/frontend/vercel.json` stay.
- Cleanup runs before the install, so the package manager sees the pruned `package.json` and the
  lockfile it writes matches it. The generated project passes `pnpm install --frozen-lockfile` from
  the first commit.
- The Canton scaffold is committed as one baseline commit, using your own git identity, so you can
  see what you changed afterwards.

```json
{
  "success": true,
  "stack": "canton",
  "projectName": "my_canton_dapp",
  "mode": "full",
  "features": [],
  "path": "/absolute/path/to/my_canton_dapp",
  "postInstall": [
    "Docker must be running",
    "Run ./scripts/dev-stack.sh — the first run pulls about 10 GB",
    "Read README.md for the step-by-step and the browser wallet you need"
  ]
}
```

## Repo / ref overrides (env vars)

Each stack's source repository and ref can be overridden — useful for forks, or for testing a
feature branch before it lands on `main`.

| Variable | Effect |
|---|---|
| `DAPPBOOSTER_EVM_REPO_URL` | Override the EVM stack git URL |
| `DAPPBOOSTER_EVM_REF` | Override the EVM stack ref (still checks out the latest tag if unset) |
| `DAPPBOOSTER_CANTON_REPO_URL` | Override the Canton stack git URL |
| `DAPPBOOSTER_CANTON_REF` | Override the Canton stack ref (still checks out the latest tag if unset) |

```shell
DAPPBOOSTER_CANTON_REPO_URL=file:///path/to/local/clone \
  pnpm dlx dappbooster --canton --ni --name my_canton
```

Both stacks check out the latest tag of their repository:
[`BootNodeDev/dAppBooster`](https://github.com/BootNodeDev/dAppBooster) for EVM and
[`BootNodeDev/canton-dappbooster`](https://github.com/BootNodeDev/canton-dappbooster) for Canton.

## Development

```shell
git clone git@github.com:BootNodeDev/dAppBoosterInstallScript.git
cd dAppBoosterInstallScript
nvm use
corepack enable
pnpm i
pnpm build
node dist/cli.js
```

Run it from a scratch directory: the wizard scaffolds the new project into whatever folder you start
it from. `pnpm i` also installs the Git hooks.

| Command | Purpose |
|---|---|
| `pnpm build` | Compile `source/` to `dist/` |
| `pnpm dev` | The same, in watch mode |
| `pnpm typecheck` | Types only, no output. Two passes: `source/` for the build, then the tests |
| `pnpm test` | Run the vitest suite |
| `pnpm test:coverage` | The same, with a coverage report |
| `pnpm lint` | Biome check, warnings included |
| `pnpm lint:fix` | Biome check with `--write` |
| `pnpm knip` | Report unused files, exports, and dependencies |

### Git hooks

[husky](https://typicode.github.io/husky/) installs three hooks on `pnpm i`:

- **commit-msg** runs [commitlint](https://commitlint.js.org/). Messages follow
  [Conventional Commits](https://www.conventionalcommits.org/): `type(scope): subject`.
- **pre-commit** runs [lint-staged](https://github.com/lint-staged/lint-staged): Biome writes the
  staged files, then typecheck, tests and knip read them. It also scans the staged changes for
  secrets.
- **pre-push** runs lint, typecheck and tests, then scans the outgoing commits for secrets.

Secret scanning uses [gitleaks](https://github.com/gitleaks/gitleaks), pinned in
[`.gitleaks-version`](.gitleaks-version). The hooks install it into `bin/` on first use through
[`scripts/install-gitleaks.sh`](scripts/install-gitleaks.sh), so local runs and CI apply the same
version and the same rules. To scan the whole history yourself:

```shell
./scripts/install-gitleaks.sh
./bin/gitleaks git --redact --verbose --exit-code 1 .
```

### Continuous integration

[`.github/workflows/pr.yml`](.github/workflows/pr.yml) runs on every pull request: Biome, then
typecheck and build and knip, then the test suite on the `.nvmrc` version and again on the Node 22
floor declared in `engines`, then commitlint over both the commit range and the PR title, then
gitleaks over the full history. Two smaller workflows assign the author to their own pull request
and add new issues and pull requests to the project board.

### Contributing

[`CLAUDE.md`](CLAUDE.md) holds the conventions and [`architecture.md`](architecture.md) indexes the
architecture docs. Both are worth reading before a first change.

## Releasing new versions to NPM

New releases are automatically uploaded to NPM via GitHub Actions. Publishing a GitHub Release runs
[`.github/workflows/release.yml`](.github/workflows/release.yml), which builds and publishes.
Marking the release as a pre-release runs `npm publish --dry-run` instead, so a release can be
rehearsed without shipping.
