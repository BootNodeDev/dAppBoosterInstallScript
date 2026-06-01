#!/usr/bin/env node
import process from 'node:process'
import meow from 'meow'
import { type Stack, isStackName, stackNames } from './constants/config.js'
import { getInfoOutput } from './info.js'
import { runNonInteractive } from './nonInteractive.js'

const cli = meow(
  `
  Usage
    $ dappbooster [options]

  Stack selection (mutually exclusive)
    --canton                 Use the Canton stack (Daml, Carpincho wallet, off-chain services)
    --evm                    Use the EVM stack (Ethereum, Polygon, Base, …) [default]
    --stack <evm|canton>     Explicit stack name (alternative to --canton/--evm)

  Common options
    --name <string>          Project name (alphanumeric, underscores)
    --mode <full|custom>     Installation mode
    --features <list>        Comma-separated features (with --mode=custom)
                               EVM:
                                 demo       Component demos and example pages
                                 subgraph   TheGraph subgraph integration
                                 typedoc    TypeDoc API documentation
                                 vocs       Vocs documentation site
                                 husky      Git hooks (Husky, lint-staged, commitlint)
                               Canton:
                                 counter    Counter demo dapp
                                 e2e        Playwright end-to-end tests (requires counter)
                                 carpincho  Carpincho browser-extension wallet
                                 llm        LLM and agent artifacts (.claude, AGENTS.md, …)
                               Dependencies are auto-resolved: requesting e2e
                               also pulls in counter.
    --non-interactive, --ni  Run without prompts (auto-enabled when not a TTY)
    --info                   Output feature metadata as JSON (filter with --stack)
    --help                   Show this help
    --version                Show version

  Non-interactive mode
    Requires --name and --mode. Outputs JSON to stdout.
    Activates automatically when stdout is not a TTY.
    Use --ni to force non-interactive mode in a TTY environment.

    AI agents: non-interactive mode activates automatically. Run --info
    to discover available stacks and features (including each feature's
    "requires"), then pass --canton or --evm plus --name and --mode flags.
    Feature dependencies are resolved automatically, so the returned
    "features" list may include extras pulled in by your selection.
    Output is JSON for easy parsing.

  Examples
    Interactive (prompts for stack and options):
      $ dappbooster

    Canton stack, full install (non-interactive):
      $ dappbooster --canton --ni --name my_dapp --mode full

    EVM stack, custom install:
      $ dappbooster --evm --ni --name my_dapp --mode custom --features demo,subgraph

    Discover canton features:
      $ dappbooster --info --stack canton
`,
  {
    importMeta: import.meta,
    flags: {
      stack: {
        type: 'string',
      },
      canton: {
        type: 'boolean',
        default: false,
      },
      evm: {
        type: 'boolean',
        default: false,
      },
      name: {
        type: 'string',
      },
      mode: {
        type: 'string',
      },
      features: {
        type: 'string',
      },
      nonInteractive: {
        type: 'boolean',
        default: false,
      },
      ni: {
        type: 'boolean',
        default: false,
      },
      info: {
        type: 'boolean',
        default: false,
      },
    },
  },
)

function reportFlagError(error: string): void {
  console.log(JSON.stringify({ success: false, error }, null, 2))
  process.exitCode = 1
}

function resolveStackFlag(flags: {
  stack?: string
  canton: boolean
  evm: boolean
}): Stack | undefined {
  const explicit: string[] = []
  if (flags.canton) {
    explicit.push('canton')
  }
  if (flags.evm) {
    explicit.push('evm')
  }
  if (flags.stack) {
    explicit.push(flags.stack)
  }

  const unique = Array.from(new Set(explicit))

  if (unique.length > 1) {
    reportFlagError(
      `Conflicting stack flags: ${unique.join(', ')}. Pick exactly one of --canton, --evm, or --stack.`,
    )
    return undefined
  }

  const candidate = unique[0]
  if (candidate === undefined) {
    return undefined
  }

  if (!isStackName(candidate)) {
    reportFlagError(`Invalid stack: '${candidate}'. Valid stacks: ${stackNames.join(', ')}`)
    return undefined
  }

  return candidate
}

const resolvedStack = resolveStackFlag(cli.flags)

if (process.exitCode === 1) {
  // Stack-flag error already reported.
} else if (cli.flags.info) {
  console.log(getInfoOutput(resolvedStack))
} else if (cli.flags.nonInteractive || cli.flags.ni || !process.stdout.isTTY) {
  runNonInteractive({
    stack: resolvedStack,
    name: cli.flags.name,
    mode: cli.flags.mode,
    features: cli.flags.features,
  }).catch((error: unknown) => {
    if (process.exitCode === 1) {
      return
    }
    const message = error instanceof Error ? error.message : String(error)
    console.log(JSON.stringify({ success: false, error: message }, null, 2))
    process.exitCode = 1
  })
} else {
  const run = async () => {
    console.clear()
    const { render } = await import('ink')
    const { default: App } = await import('./app.js')

    render(<App preselectedStack={resolvedStack} />)
  }

  run().catch(console.error)
}
