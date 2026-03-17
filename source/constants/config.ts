export const repoUrl = 'https://github.com/BootNodeDev/dAppBooster.git'

export type FeatureName = 'demo' | 'subgraph' | 'typedoc' | 'vocs' | 'husky'

export type FeatureDefinition = {
  description: string
  label: string
  packages: string[]
  default: boolean
  postInstall?: string[]
}

export const featureDefinitions: Record<FeatureName, FeatureDefinition> = {
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
}

export const featureNames = Object.keys(featureDefinitions) as FeatureName[]
