import { exec as nodeExec } from 'node:child_process'
import { promisify } from 'node:util'

const execAsync = promisify(nodeExec)

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
