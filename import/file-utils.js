import { execSync } from 'node:child_process'
import { readFileSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import {
  defaultExecOptions,
  fileExecOptions,
  homeFolder,
  installPackageExecOptions,
  subgraphsDemoFolder,
} from './config.js'

/**
 * @description Create the .env.local file
 */
export function createEnvFile() {
  const envFilePath = join(process.cwd(), '.env.local')
  const exampleFilePath = join(process.cwd(), '.env.example')

  execSync(`cp ${exampleFilePath} ${envFilePath}`, defaultExecOptions)
}

/**
 * @description Install the project packages
 * @returns {Promise<void>}
 */
export function installPackages() {
  execSync('pnpm i', installPackageExecOptions)
}

/**
 * @description Removes unwanted project packages and files
 * @returns {Promise<void>}
 */
export function filesCleanup(demoSupport, subgraphSupport) {
  const subgraphPackages = [
    '@bootnodedev/db-subgraph',
    'graphql graphql-request',
    '@graphql-codegen/cli',
    '@graphql-typed-document-node/core',
  ].join(' ')

  const packagesToRemove = !subgraphSupport ? subgraphPackages : ''

  if (!demoSupport) {
    demoFilesCleanup(homeFolder)
  }

  if (packagesToRemove) {
    execSync(`pnpm remove ${packagesToRemove}`, installPackageExecOptions)

    // Remove everything subgraph-related
    if (!subgraphSupport) {
      subgraphCleanup(demoSupport)
    }
  }
}

/**
 * @description Removes the .install-files folder
 */
export function installFilesCleanup() {
  rmSync(join(process.cwd(), '.install-files'), fileExecOptions)
}

/**
 * @description Removes demo-related folders and files
 */
export async function demoFilesCleanup(homeFolder) {
  const fullHomeFolder = join(process.cwd(), homeFolder)

  rmSync(fullHomeFolder, fileExecOptions)

  execSync(`mkdir -p ${fullHomeFolder}`, defaultExecOptions)
  execSync(
    `cp -r ${join(process.cwd(), '.install-files/home/Examples/index.tsx')} ${fullHomeFolder}/Examples/index.tsx`,
    defaultExecOptions,
  )
}

/**
 * @description Removes:
 * - Subgraphs folder
 * - Subgraph demos and references to them in the demos list
 */
function subgraphCleanup(demoSupport) {
  // Remove the root subgraphs folder
  rmSync(join(process.cwd(), '/src/subgraphs'), fileExecOptions)

  // Only remove the subgraph demos if the user kept the demo list
  if (demoSupport) {
    const listPath = '/Examples/index.tsx'

    // remove the demos
    rmSync(join(process.cwd(), `${homeFolder}${subgraphsDemoFolder}`), fileExecOptions)

    // remove the list...
    rmSync(join(process.cwd(), `${homeFolder}${listPath}`), { force: true })

    // ... and replace it by the list with no subgraph demos
    execSync(
      `cp ${join(process.cwd(), `.install-files/home${listPath}`)} ${join(process.cwd(), `${homeFolder}${listPath}`)}`,
      defaultExecOptions,
    )
  }
}

/**
 * @description Cleans the package.json file by removing unused scripts
 */
export function cleanPackageJsonScripts(subgraphSupport) {
  const pkgPath = join(process.cwd(), 'package.json')
  const pkgJson = JSON.parse(readFileSync(pkgPath, 'utf8'))

  if (!subgraphSupport) {
    if (pkgJson.scripts?.['subgraph-codegen']) {
      pkgJson.scripts['subgraph-codegen'] = undefined
      writeFileSync(pkgPath, `${JSON.stringify(pkgJson, null, 2)}\n`)
    }
  }
}
