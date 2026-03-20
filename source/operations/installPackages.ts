import type { FeatureName } from '../constants/config.js'
import type { InstallationType } from '../types/types.js'
import { getPackagesToRemove } from '../utils/utils.js'
import { exec, execFile } from './exec.js'

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

  await execFile('pnpm', ['remove', ...packagesToRemove], { cwd: projectFolder })
  await exec('pnpm run postinstall', { cwd: projectFolder })
}
