import { repoUrl } from '../constants/config.js'
import { getProjectFolder } from '../utils/utils.js'
import { exec, execFile } from './exec.js'

export async function cloneRepo(
  projectName: string,
  onProgress?: (step: string) => void,
): Promise<void> {
  const projectFolder = getProjectFolder(projectName)

  onProgress?.(`Cloning dAppBooster in ${projectName}`)
  await execFile('git', ['clone', '--depth', '1', '--no-checkout', repoUrl, projectName])

  onProgress?.('Fetching tags')
  await execFile('git', ['fetch', '--tags'], { cwd: projectFolder })

  onProgress?.('Checking out latest tag')
  // Shell required for $() command substitution
  await exec('git checkout $(git describe --tags $(git rev-list --tags --max-count=1))', {
    cwd: projectFolder,
  })

  onProgress?.('Removing .git folder')
  await execFile('rm', ['-rf', '.git'], { cwd: projectFolder })

  onProgress?.('Initializing Git repository')
  await execFile('git', ['init'], { cwd: projectFolder })
}
