import type { StackConfig } from '../types/types.js'

/**
 * Scaffolding Canton is deletion. The template's three libraries are on npm as
 * `@bootnodedev/canton-connect`, `@bootnodedev/canton-dappbooster` and `@bootnodedev/canton-theme`;
 * pnpm links the local folder only while its own version satisfies the declared range, so deleting
 * the folders makes the same package.json resolve from the registry. No manifest rewrite, no
 * workspace file edit.
 */
export const canton = {
  label: 'Canton',
  description: 'dAppBooster for Canton (Daml ledger, off-chain services)',
  repoUrl: 'https://github.com/BootNodeDev/canton-dappbooster.git',
  packageManager: 'pnpm',
  minNodeVersion: '24.15.0',
  initialCommit: true,
  prepare: {
    label: 'Removing the template libraries and tooling',
    paths: [
      '.claude',
      '.github',
      'canton-connect',
      'canton-dappbooster',
      'canton-theme',
      'kit',
      'AGENTS.md',
      'CLAUDE.md',
      'architecture.md',
      'renovate.json',
      'vercel.json',
      'dapp/frontend/AGENTS.md',
      'dapp/frontend/CLAUDE.md',
      'dapp/frontend/architecture.md',
      'dapp/frontend/PROVENANCE.md',
      'dapp/daml/PROVENANCE.md',
      'pnpm-lock.yaml',
    ],
    // Scripts that run kit/ go when the folder goes. These two only name the libraries in a
    // filter argument, so nothing links them to a deleted path.
    scripts: ['release', 'release:dry'],
    devDependencies: ['typedoc', 'postcss', '@mermaid-js/mermaid-cli'],
  },
  postInstall: [
    'Docker must be running',
    'Run ./scripts/dev-stack.sh — the first run pulls about 10 GB',
    'Read README.md for the step-by-step and the browser wallet you need',
  ],
  envFiles: [{ from: '.env.example', to: '.env' }],
  features: {},
} satisfies StackConfig
