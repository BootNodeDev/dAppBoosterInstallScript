import type { FeatureName, InstallationType } from '../types/types.js'
import { getPackagesToRemove } from '../utils/utils.js'
import { execFile } from './exec.js'

/**
 * Installs the project's dependencies, minus the packages of every feature the user left out.
 * Removing through the package manager keeps package.json and the lockfile in step.
 */
export async function installPackages(
  projectFolder: string,
  mode: InstallationType,
  features: FeatureName[] = [],
  onProgress?: (step: string) => void,
): Promise<void> {
  const packagesToRemove = mode === 'full' ? [] : getPackagesToRemove(features)

  onProgress?.('Installing packages')

  if (packagesToRemove.length === 0) {
    await execFile('pnpm', ['install'], { cwd: projectFolder })
    return
  }

  await execFile('pnpm', ['remove', ...packagesToRemove], { cwd: projectFolder })

  onProgress?.('Executing post-install scripts')
  await execFile('pnpm', ['run', 'postinstall'], { cwd: projectFolder })
}
