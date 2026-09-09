import { copyFile } from 'node:fs/promises'
import { join } from 'node:path'
import { type FeatureName, getStackConfig, type Stack } from '../constants/config.js'

export async function createEnvFile(
  stack: Stack,
  projectFolder: string,
  features: FeatureName[] = [],
): Promise<void> {
  const envFiles = getStackConfig(stack).envFiles

  const selected: string[] = features

  for (const file of envFiles) {
    if (file.ifFeature !== undefined && !selected.includes(file.ifFeature)) {
      continue
    }
    await copyFile(join(projectFolder, file.from), join(projectFolder, file.to))
  }
}
