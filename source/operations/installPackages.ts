import type { FeatureName } from '../constants/config.js'
import type { InstallationType } from '../types/types.js'
import { getPackagesToRemove } from '../utils/utils.js'
import { exec } from './exec.js'

export async function installPackages(
  projectFolder: string,
  mode: InstallationType,
  features: FeatureName[] = [],
): Promise<void> {
  if (mode === 'full') {
    await exec('pnpm i', { cwd: projectFolder })
    return
  }

  const packagesToRemove = getPackagesToRemove(features)

  if (packagesToRemove.length === 0) {
    await exec('pnpm i', { cwd: projectFolder })
    return
  }

  await exec(`pnpm remove ${packagesToRemove.join(' ')}`, { cwd: projectFolder })
  await exec('pnpm run postinstall', { cwd: projectFolder })
}
