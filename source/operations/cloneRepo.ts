import { rm } from 'node:fs/promises'
import { resolve } from 'node:path'
import { getRepo, packageManager } from '../config.js'
import { getProjectFolder } from '../utils/utils.js'
import { exec, execFile } from './exec.js'

/**
 * Clones dAppBooster into `projectName`, then hands the user a fresh repository: the template's
 * `.git` goes and `git init` runs in its place. The newest tag is cloned unless `DAPPBOOSTER_REF`
 * names a ref. Picking the newest tag is the one place a shell is used, because it needs `$()`
 * command substitution.
 */
export async function cloneRepo(
  projectName: string,
  onProgress?: (step: string) => void,
): Promise<void> {
  const { url, ref } = getRepo()
  const projectFolder = getProjectFolder(projectName)

  // The installer runs this a few steps later. Checking now saves a clone that cannot be used.
  try {
    await execFile(packageManager, ['--version'])
  } catch {
    throw new Error(`${packageManager} was not found. Install it, then run the installer again.`)
  }

  onProgress?.(`Cloning dAppBooster${ref ? ` (${ref})` : ''} in ${projectName}`)
  await execFile('git', ['clone', '--depth', '1', '--no-checkout', url, projectName])

  if (ref) {
    // Fetching the ref by name keeps the clone shallow. It works for a tag or a branch.
    onProgress?.(`Checking out ${ref}`)
    await execFile('git', ['fetch', '--depth', '1', 'origin', ref], { cwd: projectFolder })
    await execFile('git', ['checkout', 'FETCH_HEAD'], { cwd: projectFolder })
  } else {
    onProgress?.('Fetching tags')
    await execFile('git', ['fetch', '--tags'], { cwd: projectFolder })

    onProgress?.('Checking out latest tag')
    await exec('git checkout $(git describe --tags $(git rev-list --tags --max-count=1))', {
      cwd: projectFolder,
    })
  }

  onProgress?.('Removing .git folder')
  await rm(resolve(projectFolder, '.git'), { recursive: true, force: true })

  onProgress?.('Initializing Git repository')
  await execFile('git', ['init'], { cwd: projectFolder })
}
