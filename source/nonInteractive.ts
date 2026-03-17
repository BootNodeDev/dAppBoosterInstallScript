import process from 'node:process'
import { type FeatureName, featureNames } from './constants/config.js'
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
  process.exit(1)
}

function parseFeatures(featuresFlag: string | undefined): FeatureName[] {
  if (!featuresFlag) {
    return []
  }

  return featuresFlag.split(',').map((f) => f.trim()) as FeatureName[]
}

function validate(flags: {
  name?: string
  mode?: string
  features?: string
}): { name: string; mode: InstallationType; features: FeatureName[] } {
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

  // --mode=full ignores --features (everything is installed)
  if (flags.mode === 'full') {
    if (projectDirectoryExists(flags.name)) {
      fail(`Project directory '${flags.name}' already exists`)
    }

    return { name: flags.name, mode: flags.mode, features: [] }
  }

  if (!flags.features) {
    fail('--mode custom requires --features. Use --info to see available features.')
  }

  const features = parseFeatures(flags.features)
  const invalidFeatures = features.filter((f) => !featureNames.includes(f))

  if (invalidFeatures.length > 0) {
    fail(
      `Unknown features: ${invalidFeatures.join(', ')}. Valid features: ${featureNames.join(', ')}`,
    )
  }

  if (projectDirectoryExists(flags.name)) {
    fail(`Project directory '${flags.name}' already exists`)
  }

  return { name: flags.name, mode: flags.mode, features }
}

export async function runNonInteractive(flags: {
  name?: string
  mode?: string
  features?: string
}): Promise<void> {
  const { name, mode, features } = validate(flags)

  try {
    await cloneRepo(name)

    const projectFolder = getProjectFolder(name)

    await createEnvFile(projectFolder)
    await installPackages(projectFolder, mode, features)
    await cleanupFiles(projectFolder, mode, features)

    const result: SuccessResult = {
      success: true,
      projectName: name,
      mode,
      features,
      path: projectFolder,
      postInstall: getPostInstallMessages(mode, features),
    }

    console.log(JSON.stringify(result, null, 2))
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    fail(message)
  }
}
