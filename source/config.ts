import process from 'node:process'
import type { FeatureDefinition, FeatureName } from './types/types.js'

export const featureDefinitions: Record<FeatureName, FeatureDefinition> = {
  demo: {
    description: 'Component demos and example pages',
    label: 'Component Demos',
    packages: [],
    default: true,
    paths: ['src/components/pageComponents/home'],
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
    packages: ['husky', 'lint-staged', '@commitlint/cli', '@commitlint/config-conventional'],
    default: true,
    paths: ['.husky', '.lintstagedrc.mjs', 'commitlint.config.js'],
    scripts: ['prepare', 'commitlint', 'commitlint:check', 'commitlint:ci'],
  },
}

export const featureEntries = Object.entries(featureDefinitions) as Array<
  [FeatureName, FeatureDefinition]
>

export const featureNames = featureEntries.map(([name]) => name)

export const defaultFeatureNames = featureEntries
  .filter(([, definition]) => definition.default)
  .map(([name]) => name)

export function isFeatureNameValid(name: string): name is FeatureName {
  return Object.hasOwn(featureDefinitions, name)
}

/** Paths the template keeps for itself. Every scaffold drops them, whatever the user picked. */
export const prepare = {
  label: 'Repository metadata',
  paths: ['.claude', 'AGENTS.md', 'CLAUDE.md', 'architecture.md', '.github'],
}

/**
 * The template's staging directory, holding the replacement files a deselected feature restores.
 * Removed once cleanup is finished with it.
 */
export const staging = {
  label: 'Install script',
  paths: ['.install-files'],
}

/**
 * The repository to clone. Without a `ref` the newest tag is cloned. `DAPPBOOSTER_REPO_URL` and
 * `DAPPBOOSTER_REF` override both, for forks and pre-release testing.
 */
export function getRepo(): { url: string; ref?: string } {
  const { DAPPBOOSTER_REPO_URL, DAPPBOOSTER_REF } = process.env

  return {
    url: DAPPBOOSTER_REPO_URL || 'https://github.com/BootNodeDev/dAppBooster.git',
    ref: DAPPBOOSTER_REF || undefined,
  }
}
