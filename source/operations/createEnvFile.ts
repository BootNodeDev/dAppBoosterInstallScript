import { exec } from './exec.js'

export async function createEnvFile(projectFolder: string): Promise<void> {
  await exec('cp .env.example .env.local', { cwd: projectFolder })
}
