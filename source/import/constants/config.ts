export const repoUrl = 'https://github.com/BootNodeDev/dAppBooster.git'
export const homeFolder = '/src/components/pageComponents/home'

export const featurePackages: {
  [key: string]: string[]
} = {
  subgraph: [
    '@bootnodedev/db-subgraph',
    'graphql graphql-request',
    '@graphql-codegen/cli',
    '@graphql-typed-document-node/core',
  ],
  typedoc: [
    'typedoc',
    'typedoc-github-theme',
    'typedoc-plugin-inline-sources',
    'typedoc-plugin-missing-exports',
    'typedoc-plugin-rename-defaults',
  ],
  vocs: ['vocs'],
  husky: ['husky', 'lint-staged', '@commitlint/cli', '@commitlint/config-conventional'],
}
