import { repoUrl } from '../constants/config.js'
import { getProjectFolder } from '../utils/utils.js'
import { exec } from './exec.js'

export async function cloneRepo(projectName: string): Promise<void> {
  const projectFolder = getProjectFolder(projectName)

  await exec(`git clone --depth 1 --no-checkout ${repoUrl} ${projectName}`)
  await exec('git fetch --tags', { cwd: projectFolder })
  await exec('git checkout $(git describe --tags $(git rev-list --tags --max-count=1))', {
    cwd: projectFolder,
  })
  await exec('rm -rf .git', { cwd: projectFolder })
  await exec('git init', { cwd: projectFolder })
}
