import { copyFile } from 'node:fs/promises'
import { join } from 'node:path'

export async function createEnvFile(projectFolder: string): Promise<void> {
  await copyFile(join(projectFolder, '.env.example'), join(projectFolder, '.env.local'))
}
