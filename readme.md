# dAppBooster installer

Agent-friendly installer that scaffolds a Web3 dApp. It supports **two stacks** — pick one per
run, either through the interactive wizard or with a single flag (`--evm` / `--canton`). It works
interactively (a React + Ink TUI) and non-interactively (flag-driven, JSON output) for CI and AI
agents.

- **EVM** — the original [dAppBooster](https://dappbooster.dev/) for Ethereum, Polygon, Base, and
  other EVM chains.
- **Canton** — [dAppBooster for Canton](https://www.dappbooster.cc/): Daml
  ledger, Carpincho wallet, off-chain services.

## Choose your stack

```shell
pnpm dlx dappbooster --evm      # EVM stack
pnpm dlx dappbooster --canton   # Canton stack
```

Omit the flag to be prompted for the stack in the wizard. Jump to the [EVM stack](#evm-stack) or
[Canton stack](#canton-stack) section for the details of each.

## Requirements

- Node >= 20
- pnpm (used by the installer itself; the scaffolded project uses pnpm or npm depending on the stack)

## Quick start (interactive)

<img src="./demo.svg" width="600">

```shell
pnpm dlx dappbooster
```

The wizard prompts for stack → project name → mode (Canton offers default / full / custom; EVM
offers full / custom) → features, then clones, installs, cleans up, and prints next steps. Pass
`--evm` or `--canton` to skip the stack prompt.

dAppBooster documentation: https://docs.dappbooster.dev/

## Agents & CI (non-interactive)

Non-interactive mode activates automatically when stdout is not a TTY, or explicitly with `--ni`.
It returns JSON on stdout and a non-zero exit code on error.

Discover stacks and features first, then install:

```shell
pnpm dlx dappbooster --info                  # all stacks + features as JSON
pnpm dlx dappbooster --info --stack canton   # filter to one stack (or --info --canton)
```

| Flag | Purpose |
|---|---|
| `--canton` / `--evm` | Pick the stack (mutually exclusive shortcuts) |
| `--stack <evm\|canton>` | Pick the stack by name (useful when scripting) |
| `--name <name>` | Project directory name (`/^[a-zA-Z0-9_]+$/`) |
| `--mode <full\|default\|custom>` | `default` (Canton only) keeps the recommended set; `full` installs every feature; `custom` needs `--features` |
| `--features <a,b,c>` | Comma-separated feature keys (custom mode only) |
| `--ni` | Force non-interactive mode |

Mixing flags that disagree (`--canton --evm`, or `--canton --stack evm`) is an error. Each stack
accepts only its own feature keys, and validation errors name the stack:

```json
{
  "success": false,
  "error": "Unknown features for stack 'canton': subgraph. Valid features: github, precommit, carpincho, llm"
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
pnpm dlx dappbooster --canton --ni --name my_canton_dapp --mode default
pnpm dlx dappbooster --canton --ni --name my_canton --mode custom --features carpincho,github
```

| Feature | Key | Default | Description |
|---|---|---|---|
| GitHub templates & workflows | `github` |  | GitHub issue/PR templates and workflows (`.github`) |
| Pre-commit hooks | `precommit` |  | Husky, lint-staged, and commitlint |
| Carpincho wallet | `carpincho` | ✓ | Carpincho browser-extension wallet (frontend + build tooling) |
| LLM & agent artifacts | `llm` | ✓ | `.claude`, `AGENTS.md`, `CLAUDE.md`, `architecture.md`, `llms.txt`, … |

`default` mode (the recommended Canton install) keeps `carpincho` + `llm` and removes `github` +
`precommit`; `full` keeps all four; `custom` lets you pick (in the wizard `github` and `precommit`
start unchecked). To remove the demo features (`counter`, `sign-message`) after scaffolding, follow
the "Removing a feature" guide in the generated `dapp/frontend/README.md` — the installer never
deletes demo source itself.

The Canton scaffold uses **npm** (a property of the generated project, not this installer). After
install: review `canton-barebones/.env`, run `npm run canton:up` to start the local Canton stack,
and `npm run app:dev` to run the dapp frontend. When `carpincho` is included, build the extension
with `npm run carpincho:build:extension` and load `carpincho-wallet/dist-extension` as an unpacked
browser extension.

**What gets stripped:**

- **EVM** always removes CI config (`.github`) and the husky/commitlint automation as hygiene.
- **Canton** treats `.github` and pre-commit hooks as optional features: `default` mode removes
  both; `full` keeps both; `custom` removes whichever you uncheck. Deselecting `carpincho` removes
  `carpincho-wallet/` and its scripts (`wallet:dev`, `carpincho:build:extension`); deselecting `llm`
  removes the agent docs. Removing `precommit` also strips the `prepare` script and the
  husky/lint-staged/commitlint dev-dependencies from the root `package.json`.
- The Canton installer never deletes demo source (the `counter`/`sign-message` features) — that is
  user-controlled via the template's `dapp/frontend/README.md`.

```json
{
  "success": true,
  "stack": "canton",
  "projectName": "my_canton_dapp",
  "mode": "default",
  "features": ["carpincho", "llm"],
  "path": "/absolute/path/to/my_canton_dapp",
  "postInstall": [
    "Review canton-barebones/.env (created from the example)",
    "Run npm run canton:up to start the local Canton stack",
    "Run npm run app:dev to start the dapp frontend",
    "Build the Carpincho extension with npm run carpincho:build:extension",
    "Load carpincho-wallet/dist-extension as an unpacked browser extension"
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
| `DAPPBOOSTER_CANTON_REF` | Override the Canton stack branch |

```shell
DAPPBOOSTER_CANTON_REF=some-feature-branch \
  pnpm dlx dappbooster --canton --ni --name my_canton --mode full
```

The Canton stack defaults to `BootNodeDev/cn-dappbooster` on the `main` branch. The repo has no
release tags yet, so it tracks `main`; once a release is tagged, switch the default to
`refType: 'tag-latest'` (or pin a `ref`) in `source/constants/config.ts`.

## Development

```shell
git clone git@github.com:BootNodeDev/dAppBoosterInstallScript.git
cd dAppBoosterInstallScript
pnpm i
node dist/cli.js
```

## Releasing new versions to NPM

New releases are automatically uploaded to NPM via GitHub Actions.
