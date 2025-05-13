#!/usr/bin/env node

import { defaultExecOptions, fileExecOptions } from './import/config.js'
import {
  cleanPackageJsonScripts,
  createEnvFile,
  filesCleanup,
  installFilesCleanup,
  installPackages,
} from './import/file-utils.js'
import { cloneRepo } from './import/git.js'
import { checkProjectName, postInstallInstructions, setupQuestions } from './import/user-prompts.js'

main()

/**
 * @description Main entry point
 */
async function main() {
  // Check if the project name is valid
  const projectName = checkProjectName(process.argv[2])

  // Clone, create .env.local file
  cloneRepo(projectName)
  createEnvFile()

  // Ask setup questions
  const { demoSupport, subgraphSupport } = await setupQuestions()

  // Install the required packages
  installPackages()

  // Remove unwanted files and packages
  filesCleanup(demoSupport, subgraphSupport)

  // Remove unwanted scripts
  cleanPackageJsonScripts(subgraphSupport)

  // Remove the install files
  installFilesCleanup()

  // Tell the user what to do after installation is finished
  postInstallInstructions(subgraphSupport)
}
