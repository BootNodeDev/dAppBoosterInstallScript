import process from 'node:process'
import { cleanupFiles, cloneRepo, createEnvFile, installPackages } from './operations/index.js'
import { beginInstall, completeInstall } from './operations/installGuard.js'
import { getFeatureNames, isFeatureNameValid } from './stacks/index.js'
import type { FeatureName, InstallationType, Stack } from './types/types.js'
import {
  getPostInstallMessages,
  getProjectFolder,
  isValidName,
  projectDirectoryExists,
  resolveModeFeatures,
} from './utils/utils.js'

type SuccessResult = {
  success: true
  projectName: string
  mode: InstallationType
  features: FeatureName[]
  path: string
  postInstall: string[]
}

/** An error already written to stdout as JSON, so the caller must not report it a second time. */
export class ReportedError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ReportedError'
  }
}

/** Writes the failure envelope agents and CI parse, then stops the run. */
export function reportFailure(error: string): ReportedError {
  console.log(JSON.stringify({ success: false, error }, null, 2))
  process.exitCode = 1
  return new ReportedError(error)
}

function fail(error: string): never {
  throw reportFailure(error)
}

function parseFeatures(featuresFlag: string | undefined): string[] {
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

/** The mode and features the flags ask for, once the stack is known to be valid. */
function resolveModeAndFeatures(
  stack: Stack,
  flags: { mode?: string; features?: string },
): { mode: InstallationType; features: FeatureName[] } {
  if (!flags.mode) {
    fail('Missing required flag: --mode')
  }

  if (flags.mode !== 'full' && flags.mode !== 'custom') {
    fail("Invalid mode: must be 'full' or 'custom'")
  }

  if (flags.mode === 'full') {
    return { mode: 'full', features: resolveModeFeatures(stack, 'full') }
  }

  if (!flags.features) {
    fail('--mode custom requires --features. Use --info to see available features.')
  }

  const requested = parseFeatures(flags.features)

  if (requested.length === 0) {
    fail('--features value is empty. Use --info to see available features.')
  }

  const features: FeatureName[] = []
  const invalidFeatures: string[] = []

  for (const name of requested) {
    if (isFeatureNameValid(stack, name)) {
      features.push(name)
    } else {
      invalidFeatures.push(name)
    }
  }

  if (invalidFeatures.length > 0) {
    const validNames = getFeatureNames(stack).join(', ')
    fail(`Unknown features: ${invalidFeatures.join(', ')}. Valid features: ${validNames}`)
  }

  return { mode: 'custom', features: resolveModeFeatures(stack, 'custom', features) }
}

function validate(flags: { name?: string; mode?: string; features?: string }): {
  stack: Stack
  name: string
  mode: InstallationType
  features: FeatureName[]
} {
  const stack = 'evm'

  if (!flags.name) {
    fail('Missing required flag: --name')
  }

  if (!isValidName(flags.name)) {
    fail(
      'Invalid project name: only letters, numbers, underscores and non-initial dashes are allowed',
    )
  }

  const { mode, features } = resolveModeAndFeatures(stack, flags)

  if (projectDirectoryExists(flags.name)) {
    fail(`Project directory '${flags.name}' already exists`)
  }

  return { stack, name: flags.name, mode, features }
}

export async function runNonInteractive(flags: {
  name?: string
  mode?: string
  features?: string
}): Promise<void> {
  const { stack, name, mode, features } = validate(flags)

  const projectFolder = getProjectFolder(name)

  try {
    beginInstall(projectFolder)

    await cloneRepo(stack, name)
    await cleanupFiles(stack, projectFolder, mode, features)
    await createEnvFile(stack, projectFolder)
    await installPackages(stack, projectFolder, mode, features)

    completeInstall()

    const result: SuccessResult = {
      success: true,
      projectName: name,
      mode,
      features,
      path: projectFolder,
      postInstall: getPostInstallMessages(stack, features),
    }

    console.log(JSON.stringify(result, null, 2))
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error)
    fail(message)
  }
}
