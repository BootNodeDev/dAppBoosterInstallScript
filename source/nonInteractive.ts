import process from 'node:process'
import {
  type FeatureName,
  type Stack,
  getFeatureNames,
  isFeatureNameValid,
  isStackName,
  stackNames,
} from './constants/config.js'
import { cleanupFiles, cloneRepo, createEnvFile, installPackages } from './operations/index.js'
import type { InstallationType } from './types/types.js'
import {
  getPostInstallMessages,
  getProjectFolder,
  isValidName,
  projectDirectoryExists,
} from './utils/utils.js'

type SuccessResult = {
  success: true
  stack: Stack
  projectName: string
  mode: InstallationType
  features: FeatureName[]
  path: string
  postInstall: string[]
}

type ErrorResult = {
  success: false
  error: string
}

function fail(error: string): never {
  const result: ErrorResult = { success: false, error }
  console.log(JSON.stringify(result, null, 2))
  process.exitCode = 1
  throw new Error(error)
}

function parseFeatures(featuresFlag: string | undefined): FeatureName[] {
  if (!featuresFlag) {
    return []
  }

  const seen = new Set<string>()

  return featuresFlag
    .split(',')
    .map((f) => f.trim())
    .filter((f) => {
      if (f === '' || seen.has(f)) {
        return false
      }

      seen.add(f)
      return true
    })
}

function validate(flags: {
  stack?: string
  name?: string
  mode?: string
  features?: string
}): {
  stack: Stack
  name: string
  mode: InstallationType
  features: FeatureName[]
} {
  const stackFlag = flags.stack ?? 'evm'

  if (!isStackName(stackFlag)) {
    fail(`Invalid stack: '${stackFlag}'. Valid stacks: ${stackNames.join(', ')}`)
  }

  const stack = stackFlag

  if (!flags.name) {
    fail('Missing required flag: --name')
  }

  if (!flags.mode) {
    fail('Missing required flag: --mode')
  }

  if (!isValidName(flags.name)) {
    fail('Invalid project name: only letters, numbers, and underscores are allowed')
  }

  if (flags.mode !== 'full' && flags.mode !== 'custom') {
    fail("Invalid mode: must be 'full' or 'custom'")
  }

  if (flags.mode === 'full') {
    if (projectDirectoryExists(flags.name)) {
      fail(`Project directory '${flags.name}' already exists`)
    }

    return { stack, name: flags.name, mode: flags.mode, features: getFeatureNames(stack) }
  }

  if (!flags.features) {
    fail('--mode custom requires --features. Use --info to see available features.')
  }

  const features = parseFeatures(flags.features)

  if (features.length === 0) {
    fail('--features value is empty. Use --info to see available features.')
  }

  const invalidFeatures = features.filter((f) => !isFeatureNameValid(stack, f))

  if (invalidFeatures.length > 0) {
    const validNames = getFeatureNames(stack).join(', ')
    fail(
      `Unknown features for stack '${stack}': ${invalidFeatures.join(', ')}. Valid features: ${validNames}`,
    )
  }

  if (projectDirectoryExists(flags.name)) {
    fail(`Project directory '${flags.name}' already exists`)
  }

  return { stack, name: flags.name, mode: flags.mode, features }
}

export async function runNonInteractive(flags: {
  stack?: string
  name?: string
  mode?: string
  features?: string
}): Promise<void> {
  const { stack, name, mode, features } = validate(flags)

  try {
    await cloneRepo(stack, name)

    const projectFolder = getProjectFolder(name)

    await createEnvFile(stack, projectFolder, features)
    await installPackages(stack, projectFolder, mode, features)
    await cleanupFiles(stack, projectFolder, mode, features)

    const result: SuccessResult = {
      success: true,
      stack,
      projectName: name,
      mode,
      features,
      path: projectFolder,
      postInstall: getPostInstallMessages(stack, mode, features),
    }

    console.log(JSON.stringify(result, null, 2))
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error)
    fail(message)
  }
}
