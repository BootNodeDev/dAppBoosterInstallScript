#!/usr/bin/env node

import { execSync } from 'node:child_process'
import { readFileSync, rmSync, writeFileSync } from 'node:fs'
import os from 'node:os'
import { join } from 'node:path'
import readline from 'node:readline'
import chalk from 'chalk'

const commandSilencer = os.platform() === 'win32' ? '> nul 2>&1' : '> /dev/null 2>&1'
const repoUrl = 'https://github.com/BootNodeDev/dAppBooster.git'
const homeFolder = '/src/components/pageComponents/home'
const projectName = process.argv[2].replace(/[^a-zA-Z0-9-_]/g, '-')
const defaultExecOptions = {
  stdio: 'pipe',
  shell: true,
}

let removedDemoFolder = false
let removedSubgraphSupport = false

main()

/**
 * @description Main entry point
 */
async function main() {
  checkProjectName()
  cloneRepo()
  createEnvFile()
  await removeDemoFolder()
  await installPackages()
  removeInstallFiles()
  postInstallInstructions()
}

/**
 * @description Check if the project name is valid
 */
function checkProjectName() {
  const error = !projectName
    ? `${chalk.red.bold(`
#################################################
# A directory name is mandatory.                #
#                                               #
# Letters (a–z, A–Z), numbers (0–9),            #
# hyphens (-), and underscores (_) are allowed. #
#################################################`)}`
    : !/^[a-zA-Z0-9-_]+$/.test(projectName)
      ? `${chalk.red.bold(`
#################################################
# Invalid project name.                         #
#                                               #
# Letters (a–z, A–Z), numbers (0–9),            #
# hyphens (-), and underscores (_) are allowed. #
#################################################`)}`
      : ''

  if (error) {
    console.error(error.trim())
    process.exit(1)
  }
}

/**
 * @description Get the latest tag from the repository
 * @returns {string} The latest tag
 */
function getLatestTag() {
  execSync(`git fetch --tags ${commandSilencer}`, defaultExecOptions)
  const tags = execSync('git tag -l --sort=-v:refname').toString().trim().split('\n')
  return tags[0]
}

/**
 * @description Clone the repository
 */
function cloneRepo() {
  const projectDir = join(process.cwd(), projectName)

  try {
    console.log(`Installing dAppBooster in ${chalk.bold(`${projectName}`)}`)
    // execSync(`git clone --depth 1 --no-checkout "${repoUrl}" "${projectDir}"`, defaultExecOptions)
    execSync(`git clone "${repoUrl}" "${projectDir}"`, defaultExecOptions)

    console.log('')
    console.log(`Moving into ${chalk.bold(`${projectName}`)}`)
    process.chdir(projectDir)

    // const latestTag = getLatestTag()

    // if (latestTag) {
    //   console.log(`Checking out latest tag: ${chalk.bold(latestTag)}`)
    //   execSync(`git checkout "${latestTag}"`, defaultExecOptions)
    // } else {
    //   console.log(`No tags found, checking out ${chalk.bold('main')} branch...`)
    //   execSync('git checkout main', defaultExecOptions)
    // }

    execSync('git checkout main-tmp', defaultExecOptions)

    // Remove .git, and initialize the repo
    rmSync(join(projectDir, '.git'), { recursive: true, force: true })
    execSync('git init', defaultExecOptions)

    console.log(`Repository cloned in ${chalk.bold(projectDir)}`)
    // if (latestTag) {
    //   console.log(`Version: ${chalk.bold(latestTag)}`)
    // }
  } catch (error) {
    console.error(`${chalk.bold.red('An error occurred:')}`, error.message)
    process.exit(1)
  }

  console.log('\n---\n')
}

/**
 * @description Create the .env.local file
 */
function createEnvFile() {
  const envFilePath = join(process.cwd(), '.env.local')
  const exampleFilePath = join(process.cwd(), '.env.example')

  try {
    execSync(`cp ${exampleFilePath} ${envFilePath}`, defaultExecOptions)
    console.log('Creating .env file')
    console.log('')
    console.log(`${chalk.green.bold('Created')} ${chalk.bold('.env.local')}`)
  } catch (error) {
    console.error(chalk.red.bold('Error creating .env.local file:'), error.message)
  }
  console.log('\n---\n')
}

function askQuestion(query) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  })
  return new Promise((resolve) => {
    rl.question(query, (answer) => {
      rl.close()
      resolve(answer)
    })
  })
}

/**
 * @description Asks the user if they want to remove the demo folder
 * @returns {Promise<void>}
 */
async function removeDemoFolder() {
  const answer = await askQuestion('Do you want to remove the home page and all the demos? (y/N) ')

  if (answer.toLowerCase() === 'y') {
    const fullHomeFolder = join(process.cwd(), homeFolder)
    removedDemoFolder = true

    console.log('')
    console.log(`${chalk.bold.red('Removed')} ${chalk.bold(`${fullHomeFolder}`)}`)

    rmSync(fullHomeFolder, { recursive: true, force: true })

    execSync(`mkdir -p ${fullHomeFolder}`, defaultExecOptions)
    execSync(
      `cp -r ${join(process.cwd(), '.install-files/home/index.tsx')} ${fullHomeFolder}/index.tsx`,
      defaultExecOptions,
    )

    console.log(`${chalk.bold.green('Created')} ${chalk.bold(`${fullHomeFolder}/index.tsx`)}`)
  }

  console.log('\n---\n')
}

/**
 * @description Cleans the package.json file by removing unused scripts
 */
function cleanPackageJson() {
  const pkgPath = join(process.cwd(), 'package.json')
  const pkgJson = JSON.parse(readFileSync(pkgPath, 'utf8'))

  if (pkgJson.scripts?.['subgraph-codegen']) {
    pkgJson.scripts['subgraph-codegen'] = undefined
    writeFileSync(pkgPath, `${JSON.stringify(pkgJson, null, 2)}\n`)
  }
}

/**
 * @description Installs the project packages, asks the user if they want to remove
 * subgraph support, and removes the subgraph packages if needed
 * @returns {Promise<void>}
 */
async function installPackages() {
  const installPackageExecOptions = { stdio: 'inherit', shell: true }
  console.log('Installing project packages')
  console.log('')

  const answer = await askQuestion('Does your project need subgraph support? (y/N) ')
  console.log('')

  if (answer.toLowerCase() === 'y') {
    execSync('pnpm i', installPackageExecOptions)
  } else {
    removedSubgraphSupport = true

    execSync(
      'pnpm remove @bootnodedev/db-subgraph graphql graphql-request @graphql-codegen/cli @graphql-typed-document-node/core',
      installPackageExecOptions,
    )
    rmSync(join(process.cwd(), '/src/subgraphs'), { recursive: true, force: true })
    cleanPackageJson()

    console.log('')
    console.log(`${chalk.bold.red('Removed')} subgraph packages and folder.`)
    console.log(`${chalk.bold.red('Removed')} subgraph-codegen script from package.json`)
  }

  console.log('\n---\n')
}

/**
 * @description Removes the .install-files folder
 */
function removeInstallFiles() {
  rmSync(join(process.cwd(), '.install-files'), { recursive: true, force: true })
}

/**
 * @description Prints instructions for subgraph support
 */
function subgraphInstructions() {
  if (!removedSubgraphSupport) {
    console.log(
      `${chalk.yellow.bold('##################################################################################')}`,
    )
    console.log(
      `${chalk.yellow.bold('# WARNING: Your project includes subgraph support, before you continue you MUST: #')}`,
    )
    console.log(
      `${chalk.yellow.bold('##################################################################################')}`,
    )
    console.log('')
    console.log(
      `${chalk.white(`1- Provide your own API key for the var ${chalk.bold('PUBLIC_SUBGRAPHS_API_KEY')} in ${chalk.italic('.env.local')}`)}`,
    )
    console.log(
      `${chalk.white(`   You can get one at ${chalk.bold.underline('https://thegraph.com/studio/apikeys/')}`)}`,
    )
    console.log(`2- Run ${chalk.bold('pnpm subgraph-codegen')} in your console.`)
    console.log('')
    console.log('Only after you followed these steps you may proceed.')
    console.log('\n---\n')
  }
}

/**
 * @description Prints post-install instructions
 */
function postInstallInstructions() {
  subgraphInstructions()
  console.log('To start development on your project:')
  console.log('')
  console.log('1- Move into the project directory')
  console.log(chalk.cyan(`$ cd ${projectName}`))
  console.log('')
  console.log('2- Start the development server')
  console.log(chalk.cyan('$ pnpm dev'))
  console.log('')
  console.log(`You can edit the home page in ${chalk.bold(join(process.cwd(), homeFolder))}`)
  console.log('\n---\n')
  console.log(`Check out ${chalk.bold('.env.local')} for more project configurations.`)
  console.log(`Check out the docs at ${chalk.bold.underline('https://docs.dappbooster.dev/')}`)
}
