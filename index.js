#!/usr/bin/env node

import { createEnvFile, installPackages } from './import/install.js'
import { cloneRepo } from './import/git.js'
import {
  checkProjectName,
  installationSetup,
  postInstallInstructions,
} from './import/user-prompts.js'

main().then(() => console.log('\n👻\n'))

/**
 * @description Main entry point
 */
async function main() {
  // Check if the project name is valid
  const projectName = checkProjectName(process.argv[2])

  // Clone, create .env.local file
  cloneRepo(projectName)
  createEnvFile(projectName)

  // Ask setup questions
  const { demoSupport, subgraphSupport, typedocSupport, vocsSupport, huskySupport } =
    await installationSetup()

  // Install the required packages
  installPackages(demoSupport, subgraphSupport, typedocSupport, vocsSupport, huskySupport)

  // Tell the user what to do after installation is finished
  postInstallInstructions(subgraphSupport, projectName)
}
