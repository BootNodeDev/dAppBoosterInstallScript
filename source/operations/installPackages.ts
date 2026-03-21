import type { FeatureName } from '../constants/config.js'
import type { InstallationType } from '../types/types.js'
import { getPackagesToRemove } from '../utils/utils.js'
import { execFile } from './exec.js'

export async function installPackages(
  projectFolder: string,
  mode: InstallationType,
  features: FeatureName[] = [],
  onProgress?: (step: string) => void,
): Promise<void> {
  if (mode === 'full') {
    onProgress?.('Installing packages')
    await execFile('pnpm', ['i'], { cwd: projectFolder })
    return
  }

  const packagesToRemove = getPackagesToRemove(features)

  if (packagesToRemove.length === 0) {
    onProgress?.('Installing packages')
    await execFile('pnpm', ['i'], { cwd: projectFolder })
    return
  }

  onProgress?.('Installing packages')
  await execFile('pnpm', ['remove', ...packagesToRemove], { cwd: projectFolder })

  onProgress?.('Executing post-install scripts')
  await execFile('pnpm', ['run', 'postinstall'], { cwd: projectFolder })
}
