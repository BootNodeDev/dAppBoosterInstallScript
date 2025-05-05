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

checkProjectName()
cloneRepo(projectName, repoUrl)

/**
 * @description Check if the project name is valid
 * @param {*} name
 */
function checkProjectName(name) {
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
 * @description Get the latest tag in the repository
 * @param {Object} execOptions The options to pass to the exec
 * @returns {string} The latest tag in the repository
 */
function getLatestTag(execOptions) {
  // Fetch all tags
  execSync(`git fetch --tags ${commandSilencer}`, execOptions)

  // Get all tags, sorted by version
  const tags = execSync('git tag -l --sort=-v:refname').toString().trim().split('\n')

  // Return the first (latest) tag
  return tags[0]
}

/**
 * @description Clone the specified repository
 * @param {string} projectName The name of the project
 * @param {string} repoUrl The URL of the repository
 * @returns {void}
 */
function cloneRepo(projectName, repoUrl) {
  const sanitizedProjectName = projectName.replace(/[^a-zA-Z0-9-_]/g, '-')
  const projectDir = join(process.cwd(), sanitizedProjectName)
  const execOptions = {
    stdio: 'pipe',
    shell: true,
  }

  try {
    console.log('\nCloning dAppBooster...')

    // Clone the repository
    execSync(`git clone --depth 1 --no-checkout "${repoUrl}" "${projectDir}"`, execOptions)

    // Change to the project directory
    process.chdir(projectDir)

    // Get the latest tag
    const latestTag = getLatestTag()

    if (latestTag) {
      console.log(`Checking out latest tag: ${latestTag}`)
      execSync(`git checkout "${latestTag}"`, execOptions)
    } else {
      console.log(`No tags found, checking out ${chalk.bold('main')} branch...`)
      execSync('git checkout main', execOptions)
    }

    // Remove the .git directory
    rmSync(join(projectDir, '.git'), { recursive: true, force: true })

    // Initialize a new git repository
    execSync('git init', execOptions)

    // Success
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

/**
 * @description Some extra instructions for the user
 */
function userInstructions() {
  // Some extra instructions for the user
  console.log(`
${chalk.blue.bold('You can now start your project with the following commands:')}

${chalk.gray.italic('# Change to the project directory')}
$ ${chalk.cyan(`cd ${sanitizedProjectName}`)}

${chalk.gray.italic('# Install dependencies')}
$ ${chalk.cyan('pnpm install')}

${chalk.gray.italic('# Copy the example environment file')}
$ ${chalk.cyan('cp .env.example .env.local')}

${chalk.gray.italic('# Start the development server')}
$ ${chalk.cyan('pnpm dev')}

---

Remember to also check out the docs in ${chalk.green.bold('https://docs.dappbooster.dev/')}
`)
}
