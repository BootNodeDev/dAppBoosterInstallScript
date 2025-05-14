import { execSync } from 'node:child_process'
import { existsSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import chalk from 'chalk'
import { defaultExecOptions, fileExecOptions, homeFolder, installPackageExecOptions } from './config.js'

/**
 * @description Create the .env.local file
 */
export function createEnvFile() {
  const envFilePath = join(process.cwd(), '.env.local')
  const exampleFilePath = join(process.cwd(), '.env.example')

  execSync(`cp ${exampleFilePath} ${envFilePath}`, defaultExecOptions)
}

/**
 * @description Install project packages, remove unwanted ones.
 */
export function installPackages(
  demoSupport,
  subgraphSupport,
  typedocSupport,
  vocsSupport,
  huskySupport,
) {
  const subgraphPackages = !subgraphSupport
    ? [
        '@bootnodedev/db-subgraph',
        'graphql graphql-request',
        '@graphql-codegen/cli',
        '@graphql-typed-document-node/core',
      ]
    : []
  const typedocPackages = !typedocSupport
    ? [
        'typedoc',
        'typedoc-github-theme',
        'typedoc-plugin-inline-sources',
        'typedoc-plugin-missing-exports',
        'typedoc-plugin-rename-defaults',
      ]
    : []
  const vocsPackages = !vocsSupport ? ['vocs'] : []
  const huskyPackages = !huskySupport
    ? ['husky', 'lint-staged', '@commitlint/cli', '@commitlint/config-conventional']
    : []

  const packagesToRemove = [
    ...subgraphPackages,
    ...typedocPackages,
    ...vocsPackages,
    ...huskyPackages,
  ]

  console.log('\n---\n')
  console.log(`Installing packages...`)

  // Remove demo files
  if (!demoSupport) {
    demoFilesCleanup()
  }

  console.log('\n---\n')

  if (!packagesToRemove.length) {
    execSync('pnpm install --loglevel warn', installPackageExecOptions)
    console.log('\n---\n')
  } else {
    // pnpm remove will install the necessary packages while uninstalling the unwanted ones...
    execSync(`pnpm remove ${packagesToRemove.join(' ')} --loglevel warn`, installPackageExecOptions)
    // ... but it won't run the post-install script, so we run it manually
    execSync(`pnpm run postinstall`, installPackageExecOptions)
    console.log('\n---\n')

    // Remove package-related files and scripts
    packageFilesCleanup(subgraphSupport, typedocSupport, vocsSupport, huskySupport)
  }

  // Remove installer files
  installFilesCleanup()
  console.log('\n---\n')
}

/**
 * @description Removes demo-related folders and files
 */
function demoFilesCleanup() {
  const absoluteHomeFolder = join(process.cwd(), homeFolder)

  console.log(`${chalk.bold.red('Removing')} demo list`)

  rmSync(absoluteHomeFolder, fileExecOptions)

  execSync(`mkdir -p ${absoluteHomeFolder}`, defaultExecOptions)
  execSync(
    `cp ${join(process.cwd(), '.install-files/home/index.tsx')} ${absoluteHomeFolder}`,
    defaultExecOptions,
  )
}

/**
 * @description Removes:
 * - Subgraphs folder
 * - Subgraph demos and references to them in the demos list
 */
function subgraphCleanup() {
  const demoListFile = join(process.cwd(), `${homeFolder}/Examples/index.tsx`)

  // Remove the root subgraphs folder
  rmSync(join(process.cwd(), '/src/subgraphs'), fileExecOptions)

  // Only remove the subgraph demos if the user kept the demo list
  if (existsSync(demoListFile)) {
    // Remove the subgraph demos
    rmSync(join(process.cwd(), `${homeFolder}/Examples/demos/subgraphs`), fileExecOptions)

    // Remove the list...
    rmSync(demoListFile, { force: true })

    // ... and replace it by the list with no subgraph demos
    execSync(
      `cp ${join(process.cwd(), `.install-files/home/Examples/index.tsx`)} ${demoListFile}`,
      defaultExecOptions,
    )
  }
}

/**
 * @description Removes typedoc files
 */
function typedocCleanup() {
  rmSync(join(process.cwd(), 'typedoc.json'), fileExecOptions)
  rmSync(join(process.cwd(), '.github/workflows/typedoc.yml'), fileExecOptions)
}

/**
 * @description Removes Vocs files
 */
function vocsCleanup() {
  rmSync(join(process.cwd(), 'docs'), fileExecOptions)
}

/**
 * @description Removes Husky files
 */
function huskyCleanup() {
  rmSync(join(process.cwd(), '.lintstagedrc.mjs'), fileExecOptions)
  rmSync(join(process.cwd(), 'commitlint.config.js'), fileExecOptions)
  rmSync(join(process.cwd(), '.husky'), fileExecOptions)
}

/**
 * @description Removes the .install-files folder
 */
function installFilesCleanup() {
  console.log(`${chalk.bold.red('Removing')} installer files`)
  rmSync(join(process.cwd(), '.install-files'), fileExecOptions)
}

/**
 * @description Cleans up the files associated with removed packages
 */
function packageFilesCleanup(subgraphSupport, typedocSupport, vocsSupport, huskySupport) {
  const pkgPath = join(process.cwd(), 'package.json')
  const pkgJson = JSON.parse(readFileSync(pkgPath, 'utf8'))

  console.log(
    `${chalk.bold.red('Removing')} files and scripts associated with uninstalled packages`,
  )

  // Remove everything subgraph-related
  if (!subgraphSupport) {
    subgraphCleanup()
    pkgJson.scripts['subgraph-codegen'] = undefined
  }

  // Remove everything typedoc-related
  if (!typedocSupport) {
    typedocCleanup()
    pkgJson.scripts['typedoc:build'] = undefined
  }

  // Remove everything vocs-related
  if (!vocsSupport) {
    vocsCleanup()
    pkgJson.scripts['docs:build'] = undefined
    pkgJson.scripts['docs:dev'] = undefined
    pkgJson.scripts['docs:preview'] = undefined
  }

  // Remove everything husky-related
  if (!huskySupport) {
    huskyCleanup()
    pkgJson.scripts['prepare'] = undefined
  }

  writeFileSync(pkgPath, `${JSON.stringify(pkgJson, null, 2)}\n`)
}
