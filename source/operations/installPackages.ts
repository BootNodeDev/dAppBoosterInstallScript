import {
  type FeatureName,
  type PackageManager,
  type Stack,
  getStackConfig,
} from '../constants/config.js'
import type { InstallationType } from '../types/types.js'
import { getPackagesToRemove } from '../utils/utils.js'
import { execFile } from './exec.js'

const removeCommand: Record<PackageManager, string> = {
  pnpm: 'remove',
  npm: 'uninstall',
}

export async function installPackages(
  stack: Stack,
  projectFolder: string,
  mode: InstallationType,
  features: FeatureName[] = [],
  onProgress?: (step: string) => void,
): Promise<void> {
  const { packageManager } = getStackConfig(stack)

  if (mode === 'full') {
    onProgress?.('Installing packages')
    await execFile(packageManager, ['install'], { cwd: projectFolder })
    return
  }

  const packagesToRemove = getPackagesToRemove(stack, features)

  if (packagesToRemove.length === 0) {
    onProgress?.('Installing packages')
    await execFile(packageManager, ['install'], { cwd: projectFolder })
    return
  }

  onProgress?.('Installing packages')
  await execFile(packageManager, [removeCommand[packageManager], ...packagesToRemove], {
    cwd: projectFolder,
  })

  onProgress?.('Executing post-install scripts')
  await execFile(packageManager, ['run', 'postinstall'], { cwd: projectFolder })
}
