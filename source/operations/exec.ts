import { exec as nodeExec, execFile as nodeExecFile } from 'node:child_process'
import { promisify } from 'node:util'

const execAsync = promisify(nodeExec)
const execFileAsync = promisify(nodeExecFile)

export async function exec(command: string, options: { cwd?: string } = {}): Promise<string> {
  try {
    const { stdout } = await execAsync(command, {
      cwd: options.cwd,
    })

    return stdout.trim()
  } catch (error: unknown) {
    const execError = error as { stderr?: string; message?: string }
    const message = execError.stderr?.trim() || execError.message || 'Unknown error'
    throw new Error(message)
  }
}

export async function execFile(
  file: string,
  args: string[],
  options: { cwd?: string } = {},
): Promise<string> {
  try {
    const { stdout } = await execFileAsync(file, args, {
      cwd: options.cwd,
    })

    return stdout.trim()
  } catch (error: unknown) {
    const execError = error as { stderr?: string; message?: string }
    const message = execError.stderr?.trim() || execError.message || 'Unknown error'
    throw new Error(message)
  }
}
