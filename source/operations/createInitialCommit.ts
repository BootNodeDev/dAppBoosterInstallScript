import { execFile } from './exec.js'

/**
 * Commits the finished scaffold as the project's baseline. `--no-verify` keeps the project's own
 * hooks, when the user kept them, from linting a tree they have not touched yet; their later
 * commits run the hooks normally.
 */
export async function createInitialCommit(projectFolder: string): Promise<void> {
  await execFile('git', ['add', '.'], { cwd: projectFolder })
  await execFile(
    'git',
    [
      '-c',
      'user.name=dAppBooster',
      '-c',
      'user.email=no-reply@dappbooster.dev',
      '-c',
      'commit.gpgsign=false',
      'commit',
      '--no-verify',
      '-m',
      'chore: initial commit',
    ],
    { cwd: projectFolder },
  )
}
