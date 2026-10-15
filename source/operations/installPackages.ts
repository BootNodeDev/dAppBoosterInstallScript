import { packageManager } from '../config.js'
import type { FeatureName } from '../types/types.js'
import { getPackagesToRemove } from '../utils/utils.js'
import { execFile } from './exec.js'

/**
 * Installs the project's dependencies, minus the packages of every feature the user left out.
 * Removing through the package manager keeps package.json and the lockfile in step.
 */
export async function installPackages(
  projectFolder: string,
  features: FeatureName[],
  onProgress?: (step: string) => void,
): Promise<void> {
  const packagesToRemove = getPackagesToRemove(features)

  onProgress?.('Installing packages')

  if (packagesToRemove.length === 0) {
    await execFile(packageManager, ['install'], { cwd: projectFolder })
    return
  }

  await execFile(packageManager, ['remove', ...packagesToRemove], { cwd: projectFolder })

  onProgress?.('Executing post-install scripts')
  await execFile(packageManager, ['run', '--if-present', 'postinstall'], { cwd: projectFolder })
}
