#!/usr/bin/env node

import { execSync } from 'child_process'
import { rmSync } from 'fs'
import os from 'os'
import { join } from 'path'
import readline from 'readline'
import chalk from 'chalk'

const commandSilencer = os.platform() === 'win32' ? '> nul 2>&1' : '> /dev/null 2>&1'
const repoUrl = 'https://github.com/BootNodeDev/dAppBooster.git'
const projectName = process.argv[2]
let removedDemoFolder = false
let removedSubgraphSupport = false

main()

async function main() {
  console.clear()
  checkProjectName()
  cloneRepo(projectName, repoUrl)
  createEnvFile()
  await removeDemoFolder()
  await installPackages()
  userInstructions(projectName)
}

function createEnvFile() {
  const envFilePath = join(process.cwd(), '.env.local')
  const exampleFilePath = join(process.cwd(), '.env.example')

  try {
    execSync(`cp ${exampleFilePath} ${envFilePath}`, { stdio: 'pipe', shell: true })
    console.log(chalk.green.bold('Created .env.local file from .env.example'))
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

async function removeDemoFolder() {
  const answer = await askQuestion(
    'Do you want to delete the examples page with all the demos (it will be replaced by a placeholder)? (y/N) ',
  )

  if (answer.toLowerCase() === 'y') {
    const pagesFolder = './src/components/pageComponents'
    removedDemoFolder = true

    console.log(chalk.red.bold(`Deleting ${pagesFolder}/home`))
    rmSync(join(process.cwd(), `${pagesFolder}/home`), { recursive: true, force: true })
    console.log(chalk.red.bold('Demo folder deleted.'))

    const emptyIndexFile = join(process.cwd(), pagesFolder, 'home.tsx')
    const emptyIndexContent = `
import React from 'react'

export const Home = () => <div>Welcome to <a href='https://dappbooster.dev' rel='noreferrer' target='_blank'>dAppBooster</a>!</div>

export default Home`.trim()

    execSync(`mkdir -p ${pagesFolder}`, { stdio: 'pipe', shell: true })
    execSync(`echo "${emptyIndexContent}" > ${emptyIndexFile}`, {
      stdio: 'pipe',
      shell: true,
    })

    console.log(chalk.green.bold('Placeholder home.tsx file created.'))
  }

  console.log('\n---\n')
}

async function installPackages() {
  console.log('Installing project packages...\n')
  const answer = await askQuestion('Does your project need Subgraph support? (y/N) ')

  if (answer.toLowerCase() === 'y') {
    execSync('pnpm i', { stdio: 'pipe', shell: true })
  } else {
    removedSubgraphSupport = true
    console.log(chalk.red.bold('Removing subgraph packages...'))

    execSync(
      'pnpm remove @bootnodedev/db-subgraph graphql graphql-request @graphql-codegen/cli @graphql-typed-document-node/core',
      { stdio: 'pipe', shell: true },
    )
    console.log(chalk.red.bold('Subgraph packages removed.'))
  }

  console.log('\n---\n')
}

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

function getLatestTag(execOptions) {
  execSync(`git fetch --tags ${commandSilencer}`, execOptions)
  const tags = execSync('git tag -l --sort=-v:refname').toString().trim().split('\n')
  return tags[0]
}

function cloneRepo(projectName, repoUrl) {
  const sanitizedProjectName = projectName.replace(/[^a-zA-Z0-9-_]/g, '-')
  const projectDir = join(process.cwd(), sanitizedProjectName)
  const execOptions = {
    stdio: 'pipe',
    shell: true,
  }

  try {
    console.log(`\nCloning dAppBooster into ${chalk.italic.green(`./${projectName}`)}`)
    execSync(`git clone --depth 1 --no-checkout "${repoUrl}" "${projectDir}"`, execOptions)

    console.log(`Moving into ${chalk.italic.green(`./${projectName}`)}`)
    process.chdir(projectDir)

    const latestTag = getLatestTag(execOptions)

    if (latestTag) {
      console.log(`Checking out latest tag: ${chalk.bold(latestTag)}`)
      execSync(`git checkout "${latestTag}"`, execOptions)
    } else {
      console.log(`No tags found, checking out ${chalk.bold('main')} branch...`)
      execSync('git checkout main', execOptions)
    }

    rmSync(join(projectDir, '.git'), { recursive: true, force: true })
    execSync('git init', execOptions)

    console.log(`\ndAppBooster repository cloned in ${chalk.bold(projectDir)}`)
    if (latestTag) {
      console.log(`Latest version: ${chalk.bold(latestTag)}`)
    }

    console.log('\n---\n')
  } catch (error) {
    console.error(`${chalk.bold.red('An error occurred:')}`, error.message)
    process.exit(1)
  }
}

function subgraphInstructions() {
  return removedSubgraphSupport
    ? ''
    : `
${chalk.blue.bold('# WARNING: Your project has subgraph support, before you continue you MUST:')}
${chalk.blue.bold(`# 1- Complete PUBLIC_SUBGRAPHS_API_KEY with your own API key in ${chalk.italic('.env.local')}`)}
${chalk.blue.bold('#    get one at https://thegraph.com/studio/apikeys/')}
${chalk.blue.bold(`# 2- Run ${chalk.italic('pnpm subgraph-codegen')} in your console.`)}`
}

function userInstructions(sanitizedProjectName) {
  console.log(`

${subgraphInstructions()}

${chalk.blue.bold('# You can now start your project with the following commands:')}

${chalk.gray.italic('# Change to the project directory')}
${chalk.cyan(`$ cd ${sanitizedProjectName}`)}

${chalk.gray.italic('# Start the development server')}
${chalk.cyan('$ pnpm dev')}

${chalk.gray.italic(`# Check ${chalk.bold('.env.local')} for extra configurations.`)}


---

Remember to also check out the docs in ${chalk.green.bold('https://docs.dappbooster.dev/')}
`)
}
