import { repoUrl } from '../constants/config.js'
import { getProjectFolder } from '../utils/utils.js'
import { exec, execFile } from './exec.js'

export async function cloneRepo(projectName: string): Promise<void> {
  const projectFolder = getProjectFolder(projectName)

  await execFile('git', ['clone', '--depth', '1', '--no-checkout', repoUrl, projectName])
  await execFile('git', ['fetch', '--tags'], { cwd: projectFolder })
  // Shell required for $() command substitution
  await exec('git checkout $(git describe --tags $(git rev-list --tags --max-count=1))', {
    cwd: projectFolder,
  })
  await execFile('rm', ['-rf', '.git'], { cwd: projectFolder })
  await execFile('git', ['init'], { cwd: projectFolder })
}
