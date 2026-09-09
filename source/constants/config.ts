import process from 'node:process'
import type { InstallationType } from '../types/types.js'

export type Stack = 'evm' | 'canton'

export type RefType = 'tag-latest' | 'branch'

export type PackageManager = 'pnpm' | 'npm'

/**
 * A single optional feature of a stack.
 *
 * @property packages - Dependencies the package manager removes (`pnpm remove` / `npm uninstall`)
 * when the feature is deselected, so package.json and the lockfile stay in step.
 * @property paths - Relative files and directories deleted when the feature is deselected.
 * Removed directories also drive script stripping in cleanupFiles.
 * @property scripts - package.json script names deleted when the feature is deselected.
 * @property dependencies - Dependencies deleted straight from package.json when the feature is
 * deselected. For features the package manager is not asked to uninstall; cleanupFiles refreshes
 * the lockfile afterwards.
 * @property requires - Other features this one depends on. Selecting it pulls these in;
 * deselecting one of these cascades this feature out. Resolved transitively (see utils.ts).
 */
export type FeatureDefinition = {
  description: string
  label: string
  packages: string[]
  default: boolean
  postInstall?: string[]
  paths?: string[]
  scripts?: string[]
  dependencies?: string[]
  requires?: string[]
}

export type EnvFile = {
  from: string
  to: string
  ifFeature?: string
}

/**
 * A stack the installer can scaffold.
 *
 * @property postInstall - Guidance shown for every scaffold of this stack, in any mode.
 */
export type StackConfig = {
  label: string
  description: string
  repoUrl: string
  refType: RefType
  ref?: string
  packageManager: PackageManager
  removeAfterClone: string[]
  postInstall?: string[]
  envFiles: EnvFile[]
  features: Record<string, FeatureDefinition>
}

const huskyPackages = ['husky', 'lint-staged', '@commitlint/cli', '@commitlint/config-conventional']

const huskyPaths = ['.husky', '.lintstagedrc.mjs', 'commitlint.config.js']

const huskyScripts = ['prepare', 'commitlint', 'commitlint:check', 'commitlint:ci']

export const stackDefinitions = {
  evm: {
    label: 'EVM',
    description: 'dAppBooster for EVM chains (Ethereum, Polygon, Base, …)',
    repoUrl: 'https://github.com/BootNodeDev/dAppBooster.git',
    refType: 'tag-latest',
    packageManager: 'pnpm',
    removeAfterClone: [],
    envFiles: [{ from: '.env.example', to: '.env.local' }],
    features: {
      demo: {
        description: 'Component demos and example pages',
        label: 'Component Demos',
        packages: [],
        default: true,
      },
      subgraph: {
        description: 'TheGraph subgraph integration',
        label: 'Subgraph support',
        packages: [
          '@bootnodedev/db-subgraph',
          'graphql',
          'graphql-request',
          '@graphql-codegen/cli',
          '@graphql-typed-document-node/core',
        ],
        default: true,
        paths: ['src/subgraphs'],
        scripts: ['subgraph-codegen'],
        postInstall: [
          'Provide your own API key for PUBLIC_SUBGRAPHS_API_KEY in .env.local',
          'Run pnpm subgraph-codegen from the project folder',
        ],
      },
      typedoc: {
        description: 'TypeDoc API documentation generation',
        label: 'Typedoc documentation support',
        packages: [
          'typedoc',
          'typedoc-github-theme',
          'typedoc-plugin-inline-sources',
          'typedoc-plugin-missing-exports',
          'typedoc-plugin-rename-defaults',
        ],
        default: true,
        paths: ['typedoc.json'],
        scripts: ['typedoc:build'],
      },
      vocs: {
        description: 'Vocs documentation site',
        label: 'Vocs documentation support',
        packages: ['vocs'],
        default: true,
        paths: ['vocs.config.ts', 'docs'],
        scripts: ['docs:build', 'docs:dev', 'docs:preview'],
      },
      husky: {
        description: 'Git hooks with Husky, lint-staged, and commitlint',
        label: 'Husky Git hooks support',
        packages: huskyPackages,
        default: true,
        paths: huskyPaths,
        scripts: huskyScripts,
      },
    },
  },
  canton: {
    label: 'Canton',
    description: 'dAppBooster for Canton (Daml ledger, Carpincho wallet, off-chain services)',
    repoUrl: 'https://github.com/BootNodeDev/cn-dappbooster.git',
    refType: 'branch',
    ref: 'main',
    packageManager: 'npm',
    removeAfterClone: [],
    postInstall: [
      'Review canton-barebones/.env (created from the example)',
      'Run ./scripts/dev-stack.sh up to bring up the whole local stack in one command — Docker must be running (run ./scripts/dev-stack.sh with no arguments for an interactive menu)',
      'Fallback — start each piece manually: npm run canton:up for the Canton stack, then npm run app:dev for the dapp frontend',
    ],
    envFiles: [
      { from: 'canton-barebones/.env.example', to: 'canton-barebones/.env' },
      { from: 'dapp/frontend/.env.local.example', to: 'dapp/frontend/.env.local' },
      {
        from: 'carpincho-wallet/.env.local.example',
        to: 'carpincho-wallet/.env.local',
        ifFeature: 'carpincho',
      },
    ],
    features: {
      github: {
        description: 'GitHub issue/PR templates and workflows (.github)',
        label: 'GitHub templates & workflows',
        packages: [],
        default: false,
        paths: ['.github'],
      },
      precommit: {
        description: 'Pre-commit hooks (Husky, lint-staged, commitlint)',
        label: 'Pre-commit hooks',
        packages: [],
        default: false,
        paths: huskyPaths,
        scripts: huskyScripts,
        dependencies: huskyPackages,
      },
      carpincho: {
        description: 'Carpincho browser-extension wallet (frontend + build tooling)',
        label: 'Carpincho wallet',
        packages: [],
        default: true,
        paths: ['carpincho-wallet'],
        postInstall: [
          './scripts/dev-stack.sh up also builds the Carpincho extension and copies it to ~/Desktop/dist-extension (load it via chrome://extensions, Developer mode -> Load unpacked)',
          'Fallback — build it manually with npm run carpincho:build:extension, then load carpincho-wallet/dist-extension as an unpacked browser extension',
        ],
      },
      llm: {
        description: 'LLM and agent artifacts (.claude, AGENTS.md, CLAUDE.md, architecture.md, …)',
        label: 'LLM & agent artifacts',
        packages: [],
        default: true,
        paths: [
          '.claude',
          'AGENTS.md',
          'CLAUDE.md',
          'architecture.md',
          '.llm',
          '.llms',
          'llm',
          'llms',
          'llms.txt',
          'docs/llm',
          'docs/llms',
        ],
      },
    },
  },
} satisfies Record<Stack, StackConfig>

/**
 * Every feature name either stack defines, read straight off `stackDefinitions`. Renaming a
 * feature in the map turns every stale reference to it into a compile error.
 */
export type FeatureName = {
  [S in Stack]: keyof (typeof stackDefinitions)[S]['features']
}[Stack]

export const stackNames = Object.keys(stackDefinitions) as Stack[]

function envOverride(stack: Stack, suffix: 'REPO_URL' | 'REF'): string | undefined {
  const key = `DAPPBOOSTER_${stack.toUpperCase()}_${suffix}`
  const value = process.env[key]
  return value && value.length > 0 ? value : undefined
}

export function getStackConfig(stack: Stack): StackConfig {
  const base: StackConfig = stackDefinitions[stack]
  const repoUrl = envOverride(stack, 'REPO_URL') ?? base.repoUrl
  const ref = envOverride(stack, 'REF') ?? base.ref
  return { ...base, repoUrl, ref }
}

/** A stack's feature map as entries. The keys are feature names by construction. */
export function getFeatureEntries(stack: Stack): Array<[FeatureName, FeatureDefinition]> {
  return Object.entries(stackDefinitions[stack].features) as Array<[FeatureName, FeatureDefinition]>
}

export function getFeatureNames(stack: Stack): FeatureName[] {
  return getFeatureEntries(stack).map(([name]) => name)
}

export function isFeatureNameValid(stack: Stack, name: string): name is FeatureName {
  return name in stackDefinitions[stack].features
}

export function isStackName(name: string): name is Stack {
  return (stackNames as string[]).includes(name)
}

export function getDefaultFeatureNames(stack: Stack): FeatureName[] {
  return getFeatureEntries(stack)
    .filter(([, definition]) => definition.default)
    .map(([name]) => name)
}

/**
 * Installation modes a stack offers. `default` (keep only the `default: true` features) is offered
 * only when the stack has at least one opt-out feature; otherwise it would be identical to `full`.
 * Today that means Canton only, since every EVM feature is on by default.
 */
export function getInstallationModes(stack: Stack): InstallationType[] {
  const hasOptOutFeature = getDefaultFeatureNames(stack).length < getFeatureNames(stack).length
  return hasOptOutFeature ? ['default', 'full', 'custom'] : ['full', 'custom']
}
