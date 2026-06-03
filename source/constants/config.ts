import process from 'node:process'
import type { InstallationType } from '../types/types.js'

export type Stack = 'evm' | 'canton'

export type RefType = 'tag-latest' | 'branch'

export type PackageManager = 'pnpm' | 'npm'

export type FeatureName = string

export type FeatureDefinition = {
  description: string
  label: string
  packages: string[]
  default: boolean
  postInstall?: string[]
  // Relative paths removed when the feature is deselected (custom mode). Directory paths also
  // drive package.json script stripping via scriptTargetsRemovedDir in cleanupFiles.
  paths?: string[]
  // Other features this one depends on. Selecting it pulls these in; deselecting one of these
  // cascades this feature out. One-directional and resolved transitively (see utils.ts).
  requires?: FeatureName[]
}

export type EnvFile = {
  from: string
  to: string
  ifFeature?: FeatureName
}

export type StackConfig = {
  label: string
  description: string
  repoUrl: string
  refType: RefType
  ref?: string
  packageManager: PackageManager
  removeAfterClone: string[]
  // Stack-level post-install guidance shown for every scaffold of this stack (any mode).
  postInstall?: string[]
  envFiles: EnvFile[]
  features: Record<FeatureName, FeatureDefinition>
}

export const stackDefinitions: Record<Stack, StackConfig> = {
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
      },
      vocs: {
        description: 'Vocs documentation site',
        label: 'Vocs documentation support',
        packages: ['vocs'],
        default: true,
      },
      husky: {
        description: 'Git hooks with Husky, lint-staged, and commitlint',
        label: 'Husky Git hooks support',
        packages: ['husky', 'lint-staged', '@commitlint/cli', '@commitlint/config-conventional'],
        default: true,
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
      'Run npm run canton:up to start the local Canton stack',
      'Run npm run app:dev to start the dapp frontend',
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
        paths: ['.husky', '.lintstagedrc.mjs', 'commitlint.config.js'],
      },
      carpincho: {
        description: 'Carpincho browser-extension wallet (frontend + build tooling)',
        label: 'Carpincho wallet',
        packages: [],
        default: true,
        paths: ['carpincho-wallet'],
        postInstall: [
          'Build the Carpincho extension with npm run carpincho:build:extension',
          'Load carpincho-wallet/dist-extension as an unpacked browser extension',
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
}

export const stackNames = Object.keys(stackDefinitions) as Stack[]

function envOverride(stack: Stack, suffix: 'REPO_URL' | 'REF'): string | undefined {
  const key = `DAPPBOOSTER_${stack.toUpperCase()}_${suffix}`
  const value = process.env[key]
  return value && value.length > 0 ? value : undefined
}

export function getStackConfig(stack: Stack): StackConfig {
  const base = stackDefinitions[stack]
  const repoUrl = envOverride(stack, 'REPO_URL') ?? base.repoUrl
  const ref = envOverride(stack, 'REF') ?? base.ref
  return { ...base, repoUrl, ref }
}

export function getFeatureNames(stack: Stack): FeatureName[] {
  return Object.keys(stackDefinitions[stack].features)
}

export function isFeatureNameValid(stack: Stack, name: string): boolean {
  return name in stackDefinitions[stack].features
}

export function isStackName(name: string): name is Stack {
  return (stackNames as string[]).includes(name)
}

export function getDefaultFeatureNames(stack: Stack): FeatureName[] {
  return Object.entries(stackDefinitions[stack].features)
    .filter(([, definition]) => definition.default)
    .map(([name]) => name)
}

// Available installation modes per stack. `default` (keep only default:true features) is offered
// only when the stack has at least one opt-out (default:false) feature; otherwise it would be
// identical to `full`. Today that means Canton only (EVM's features are all default:true).
export function getInstallationModes(stack: Stack): InstallationType[] {
  const hasOptOutFeature = getDefaultFeatureNames(stack).length < getFeatureNames(stack).length
  return hasOptOutFeature ? ['default', 'full', 'custom'] : ['full', 'custom']
}
