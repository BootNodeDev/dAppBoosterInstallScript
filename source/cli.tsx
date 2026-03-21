#!/usr/bin/env node
import process from 'node:process'
import meow from 'meow'
import { getInfoOutput } from './info.js'
import { runNonInteractive } from './nonInteractive.js'

const cli = meow(
  `
  Usage
    $ dappbooster [options]

  Options
    --name <string>          Project name (alphanumeric, underscores)
    --mode <full|custom>     Installation mode
    --features <list>        Comma-separated features (with --mode=custom):
                               demo       Component demos and example pages
                               subgraph   TheGraph subgraph integration (requires API key)
                               typedoc    TypeDoc API documentation generation
                               vocs       Vocs documentation site
                               husky      Git hooks with Husky, lint-staged, commitlint
    --non-interactive, --ni  Run without prompts (auto-enabled when not a TTY)
    --info                   Output feature metadata as JSON
    --help                   Show this help
    --version                Show version

  Non-interactive mode
    Requires --name and --mode. Outputs JSON to stdout.
    Activates automatically when stdout is not a TTY.
    Use --ni to force non-interactive mode in a TTY environment.

    AI agents: non-interactive mode activates automatically. Run --info
    to discover available features, then pass --name and --mode flags.
    Output is JSON for easy parsing.

  Examples
    Interactive:
      $ dappbooster

    Full install (non-interactive):
      $ dappbooster --ni --name my_dapp --mode full

    Custom install with specific features:
      $ dappbooster --ni --name my_dapp --mode custom --features demo,subgraph

    Get feature metadata:
      $ dappbooster --info
`,
  {
    importMeta: import.meta,
    flags: {
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

if (cli.flags.info) {
  console.log(getInfoOutput())
} else if (cli.flags.nonInteractive || cli.flags.ni || !process.stdout.isTTY) {
  runNonInteractive({
    name: cli.flags.name,
    mode: cli.flags.mode,
    features: cli.flags.features,
  }).catch((error) => {
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

    render(<App />)
  }

  run().catch(console.error)
}
