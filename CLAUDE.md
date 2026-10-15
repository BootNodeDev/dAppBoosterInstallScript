<!-- starter-kit: v2026.09 -->

# Agent configuration

> Claude Code reads this file natively. Other agents (Cursor, Windsurf, etc.) read `AGENTS.md`, which points here. This file is the single source of truth for the project's conventions, stack, and working rules.

---

## What this is

A CLI installer for [dAppBooster](https://github.com/BootNodeDev/dAppBooster), the dApp boilerplate for EVM chains. It has two modes:

- **Interactive** (default): a React + Ink TUI. It asks for the project name, the installation mode, the optional packages and a final review. Then it clones the template, cleans it up, installs the packages and shows the post-install steps.
- **Non-interactive**: driven by flags, for AI agents and CI. `--ni` turns it on, and so does a stdout that is not a TTY. It prints JSON to stdout. Run `--info` to discover the features, then pass `--name` and `--mode`, plus `--features` in custom mode.

## Stack and conventions

| Category | Technology | Notes |
|----------|-----------|-------|
| Language | TypeScript (strict mode) | Extends `@sindresorhus/tsconfig` |
| Framework | React + Ink | Terminal UI framework |
| Arg parsing | meow | CLI flag parsing for non-interactive mode |
| Package manager | pnpm | Never npm or yarn |
| Linting/formatting | Biome 2 | Run `pnpm lint` before committing |
| Testing | Vitest + @vitest/coverage-v8 | |
| Dead code | knip | `pnpm knip` fails on unused files, exports, and dependencies |
| Secret scanning | gitleaks | Pinned in `.gitleaks-version`; the hooks install it into `bin/` |
| Git hooks | Husky + lint-staged + commitlint | `pnpm i` installs them; see [Git hooks](#git-hooks) |
| Node | v24.15.0+ | `engines.node` is the published floor, matched to what dAppBooster needs; CI and development use `.nvmrc` (24) |
| Naming | camelCase vars/functions, PascalCase components/types | Biome enforces the same two cases for filenames |

## Code style

- **Semicolons:** as needed (Biome `asNeeded` leaves them out unless ASI requires one)
- **Quotes:** single
- **Print width:** 100
- **Trailing commas:** all (Biome default)
- **Indent:** spaces, width 2
- **Imports:** explicit `.js` extensions (ESM, `"type": "module"`)

## Working rules

- Use **pnpm** only (never npm or yarn), for this installer and for the scaffolded project
- Treat `dist/` as build output. Never edit it directly
- Never interpolate user input (`projectName`) into shell command strings. Use `execFile` (args array) instead
- `source/config.ts` is the single source of truth for what the installer knows about the template: the features, the paths cleanup removes, the repository to clone and the package manager. CLI `--help` text maintains its own copy.
- The env vars `DAPPBOOSTER_REPO_URL` and `DAPPBOOSTER_REF` override the repository and ref to clone. `getRepo()` reads them. Use them for forks and pre-release testing.
- Components are presentation-only. Business logic lives in `source/operations/`.

## Architecture

See [architecture.md](./architecture.md) for the full architecture guide, including data flow, how to add features, and security patterns.

Entry: `source/cli.tsx` parses args with `meow` and routes between the interactive and non-interactive paths.

- **Interactive path**: `source/app.tsx`, a step-based state machine that renders each installer step in sequence with React + Ink
- **Non-interactive path**: `source/nonInteractive.ts` validates flags, runs the operations one after another, and prints JSON

Key directories:

- `source/operations/`: business logic as plain async functions, shared by both paths
- `source/components/steps/`: TUI step components, presentation-only
- `source/components/`: reusable UI components (Ask, Divider, MainTitle, Multiselect)
- `source/__tests__/`: the Vitest suite

## Commands

| Command | Purpose |
|---------|---------|
| `pnpm build` | Compile `source/` to `dist/` |
| `pnpm dev` | The same, in watch mode |
| `pnpm typecheck` | Types only, no output. Two passes: `source/` for the build, then the tests |
| `pnpm test` | Run the Vitest suite |
| `pnpm test:coverage` | The same, with a coverage report |
| `pnpm lint` | Biome check, warnings included |
| `pnpm lint:fix` | Biome check with `--write` |
| `pnpm knip` | Report unused files, exports, and dependencies |

Run the built CLI from a scratch directory. It scaffolds the new project into the folder you start
it from, so `node dist/cli.js` in this repo would write into the repo itself.

## Demo recording

`demo.svg` in the readme is an animated SVG of a real wizard run. Regenerate it after any change to
the terminal UI:

```shell
pnpm build
./scripts/record-demo.py
```

The script scaffolds a real EVM project into a temporary directory, so it needs network and takes a
few minutes. It cleans up after itself and overwrites `demo.svg`.

Things worth knowing before touching it:

- [svg-term-cli](https://github.com/marionebl/svg-term-cli) does the conversion, through
  `pnpm dlx`. It is not a dependency. The flags `--window --width 92 --height 23 --padding 10`
  produce the size of the committed image. If you change them, change the readme's `<img>` size
  too.
- There is no way to script `asciinema` here. It ignores piped stdin, `script` refuses to start
  unless its own stdin is a tty, and `node-pty` has no prebuilt binary for this machine. The script
  uses Python's standard-library `pty` instead, which needs nothing installed.
- It waits for each prompt to appear in the output rather than sleeping a fixed time, so it does not
  break when a step gets slower.
- A `pnpm` shim on `PATH` makes `pnpm dlx dappbooster` run `dist/cli.js`. The recording shows the
  real command line, but runs the code in the working tree.
- The script trims the recording to 15 seconds so the loop stays short. After that point comes the
  package install, a long stretch of near-static output that reads as a frozen image.
- The script merges output that arrives within 150 milliseconds into one frame. That cuts the file
  about five-fold, because the spinner redraws every 80 milliseconds. It changes when bytes reach
  the recording, never which bytes.

## Testing

- **Framework:** Vitest + V8 coverage
- **Run tests:** `pnpm test` / `pnpm test:coverage`
- **Structure:** `source/__tests__/` mirrors the `source/` layout. Operations tests live in `source/__tests__/operations/`
- **What to test:** the non-interactive flow agents use (validation, JSON output), operations (correct shell commands), config, utils
- **What not to test:** React/Ink components
- **Mocking pattern:** Operations tests mock `exec`/`execFile` from `source/operations/exec.js`. `exec.test.ts` mocks `child_process.spawn` directly to test the helpers themselves. Non-interactive tests mock the entire operations layer
- **Coverage:** Focus on the interface agents use. Coverage leaves out the test files and `source/components/`

## Git hooks

`pnpm i` installs three hooks through Husky:

- **commit-msg** runs commitlint against the message.
- **pre-commit** runs lint-staged in two passes. `.lintstagedrc.format.mjs` lets Biome write the
  staged files first, then `.lintstagedrc.mjs` runs the read-only checks (typecheck, tests, knip).
  There are two passes because a reformat that lands mid-parse makes the checks fail at random. The
  hook ends by scanning the staged changes for secrets.
- **pre-push** runs lint, typecheck and tests, then scans the outgoing commits for secrets.

Secret scanning uses a pinned gitleaks. `scripts/install-gitleaks.sh` downloads that exact release
into `bin/` and verifies its sha256, so local runs and CI apply the same version and rules. To scan
the history by hand:

```shell
./scripts/install-gitleaks.sh
./bin/gitleaks git --redact --verbose --exit-code 1 .
```

## Continuous integration

`.github/workflows/pr.yml` runs on every pull request, in this order:

1. Biome
2. Typecheck, build and knip
3. The test suite on `.nvmrc`, and again on the Node 24.15.0 floor
4. commitlint over the commit range and the PR title
5. gitleaks over the full history

Changing only the PR title re-runs just commitlint.

`pr-assign.yml` assigns the author to their own pull request. `add-to-project.yml` adds new issues
and pull requests to the project board. It needs the `ADD_TO_PROJECT_PAT` secret, because the
built-in token cannot write org projects.

## Commit standards

Use [Conventional Commits](https://www.conventionalcommits.org/): `type(scope): subject`.

- **Scope** is optional: `feat: add login` and `feat(auth): add login` are both valid
- **Subject** uses imperative mood, lowercase after the colon, no trailing period
- **Body** (optional): goes after a blank line and explains *what* and *why*

`commitlint.config.js` allows these types: `build`, `chore`, `ci`, `docs`, `feat`, `fix`,
`hotfix`, `perf`, `refactor`, `release`, `revert`, `style`, `test`, `wip`.

## PR workflow

- Every PR must reference an issue (`Closes #`)

  > No related issue? Use `No related issue.` as the first line of the Summary section.

- Mirror the issue's acceptance criteria in the PR
- Self-review your diff before requesting peer review
- Keep PRs small and focused: one issue, one PR
- PR titles use the same conventional commit format, and CI checks them
- The `create-pr` skill at `.claude/skills/create-pr/` reads
  [`.github/PULL_REQUEST_TEMPLATE.md`](.github/PULL_REQUEST_TEMPLATE.md) and fills every section

## Label conventions

GitHub form dropdowns (like the Priority field in issue templates) only work through the web UI. When you create an issue with the `gh` CLI or the REST API, dropdown values become plain body text that you cannot query and that differs from issue to issue. Labels are the reliable way to store structured metadata through the API.

**Priority** (bugs, features, and epics):

| Label | Description |
|-------|-------------|
| `priority: critical` | Blocking work, system down, or security issue |
| `priority: high` | Address in the current sprint |
| `priority: medium` | Address soon |
| `priority: low` | Nice to have, can wait |

You can query labels: `gh issue list --label "priority: high"`.

The `create-issue` skill at `.claude/skills/create-issue/` applies these labels when it creates issues with the CLI. Bug, feature, and epic templates include a Priority dropdown for web UI users, but labels are the source of truth for programmatic workflows.

## Guardrails

- Do not commit secrets, API keys, or credentials. The hooks run gitleaks; do not bypass them with
  `--no-verify`
- Do not modify CI/CD pipelines without team review
- Do not skip tests or linting to make a build pass
- Pin third-party GitHub Actions to a commit SHA with the version in a trailing comment
- Raising `engines.node` breaks installs for everyone below the new floor. Treat it as a release
  decision, not a cleanup
- `ink` and `react` stay on 5 and 18. `ink-divider` still depends on `ink` 5, so moving to `ink` 7
  would load two copies of the renderer
- When in doubt, ask. Don't assume

## Change strategy

- Prefer small, focused diffs over broad refactors
- Preserve existing UX unless the task explicitly changes it
- Avoid introducing new patterns when a project pattern already exists
- Update docs only when behavior or workflow changes

## Validation checklist

Run all five before declaring work done. CI runs the same set.

- `pnpm lint`
- `pnpm typecheck`
- `pnpm build`
- `pnpm test`
- `pnpm knip`

## Release

The GitHub Actions workflow `.github/workflows/release.yml` runs on GitHub release events. A pre-release does a dry run; a full release publishes to npm.

It publishes with `npm publish`, not `pnpm publish`, because npm supports OIDC trusted publishers. That is also why the job asks for `id-token: write` instead of carrying an npm token.
