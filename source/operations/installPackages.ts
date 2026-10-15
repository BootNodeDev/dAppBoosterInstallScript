import { getStackConfig } from '../stacks/index.js'
import type { FeatureName, InstallationType, Stack } from '../types/types.js'
import { getPackagesToRemove } from '../utils/utils.js'
import { execFile } from './exec.js'

/**
 * Installs the project's dependencies, minus the packages of every feature the user left out.
 * Removing through the package manager keeps package.json and the lockfile in step.
 */
export async function installPackages(
  stack: Stack,
  projectFolder: string,
  mode: InstallationType,
  features: FeatureName[] = [],
  onProgress?: (step: string) => void,
): Promise<void> {
  const { packageManager } = getStackConfig(stack)
  const packagesToRemove = mode === 'full' ? [] : getPackagesToRemove(stack, features)

  onProgress?.('Installing packages')

  if (packagesToRemove.length === 0) {
    await execFile(packageManager, ['install'], { cwd: projectFolder })
    return
  }

  await execFile(packageManager, ['remove', ...packagesToRemove], { cwd: projectFolder })

  onProgress?.('Executing post-install scripts')
  await execFile(packageManager, ['run', 'postinstall'], { cwd: projectFolder })
}
