import { rm } from 'node:fs/promises'
import { resolve } from 'node:path'
import { type Stack, getStackConfig } from '../constants/config.js'
import { getProjectFolder } from '../utils/utils.js'
import { exec, execFile } from './exec.js'

export async function cloneRepo(
  stack: Stack,
  projectName: string,
  onProgress?: (step: string) => void,
): Promise<void> {
  const config = getStackConfig(stack)
  const projectFolder = getProjectFolder(projectName)

  if (config.refType === 'branch') {
    const branch = config.ref
    if (!branch) {
      throw new Error(`Stack '${stack}' has refType 'branch' but no 'ref' configured`)
    }

    onProgress?.(`Cloning ${config.label} (branch ${branch}) in ${projectName}`)
    await execFile('git', [
      'clone',
      '--depth',
      '1',
      '--branch',
      branch,
      '--single-branch',
      config.repoUrl,
      projectName,
    ])
  } else {
    onProgress?.(`Cloning ${config.label} in ${projectName}`)
    await execFile('git', ['clone', '--depth', '1', '--no-checkout', config.repoUrl, projectName])

    onProgress?.('Fetching tags')
    await execFile('git', ['fetch', '--tags'], { cwd: projectFolder })

    onProgress?.('Checking out latest tag')
    // Shell required for $() command substitution
    await exec('git checkout $(git describe --tags $(git rev-list --tags --max-count=1))', {
      cwd: projectFolder,
    })
  }

  for (const dir of config.removeAfterClone) {
    onProgress?.(`Removing ${dir}`)
    await rm(resolve(projectFolder, dir), { recursive: true, force: true })
  }

  onProgress?.('Removing .git folder')
  await rm(resolve(projectFolder, '.git'), { recursive: true, force: true })

  onProgress?.('Initializing Git repository')
  await execFile('git', ['init'], { cwd: projectFolder })
}
