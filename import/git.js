import { execSync } from 'node:child_process'
import { rmSync } from 'node:fs'
import os from 'node:os'
import { join } from 'node:path'
import chalk from 'chalk'
import { defaultExecOptions, fileExecOptions, repoUrl } from './config.js'

/**
 * @description Get the latest tag from the repository
 * @returns {string} The latest tag
 */
function getLatestTag() {
  const commandSilencer = os.platform() === 'win32' ? '> nul 2>&1' : '> /dev/null 2>&1'

  execSync(`git fetch --tags ${commandSilencer}`, defaultExecOptions)

  const tags = execSync('git tag -l --sort=-v:refname').toString().trim().split('\n')

  return tags[0]
}

/**
 * @description Clone the repository
 */
export function cloneRepo(projectName) {
  const projectDir = join(process.cwd(), projectName)

  try {
    console.log(`Installing dAppBooster in ${chalk.bold(`${projectName}`)}`)
    // execSync(`git clone --depth 1 --no-checkout "${repoUrl}" "${projectDir}"`, defaultExecOptions)
    execSync(`git clone "${repoUrl}" "${projectDir}"`, defaultExecOptions)

    console.log('')
    console.log(`Moving into ${chalk.bold(`${projectName}`)}`)
    process.chdir(projectDir)

    // const latestTag = getLatestTag(defaultExecOptions)

    // if (latestTag) {
    //   console.log(`Checking out latest tag: ${chalk.bold(latestTag)}`)
    //   execSync(`git checkout "${latestTag}"`, defaultExecOptions)
    // } else {
    //   console.log(`No tags found, checking out ${chalk.bold('main')} branch...`)
    //   execSync('git checkout main', defaultExecOptions)
    // }
    execSync('git checkout develop', defaultExecOptions)

    // Remove .git, and initialize the repo
    rmSync(join(projectDir, '.git'), fileExecOptions)
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
