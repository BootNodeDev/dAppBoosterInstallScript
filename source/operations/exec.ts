import { type SpawnOptions, spawn } from 'node:child_process'

function run(command: string, args: string[], options: SpawnOptions): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      ...options,
      stdio: ['ignore', 'ignore', 'pipe'],
    })

    let stderr = ''
    child.stderr?.on('data', (data: Buffer) => {
      stderr += data.toString()
    })

    child.on('close', (code, signal) => {
      if (code === 0) {
        resolve()
      } else {
        const fallback =
          signal !== null
            ? `Process killed by signal ${signal}`
            : `Command failed with exit code ${code}`
        const message = stderr.trim() || fallback
        reject(new Error(message))
      }
    })

    child.on('error', reject)
  })
}

export async function exec(command: string, options: { cwd?: string } = {}): Promise<void> {
  await run('/bin/sh', ['-c', command], { cwd: options.cwd })
}

export async function execFile(
  file: string,
  args: string[],
  options: { cwd?: string } = {},
): Promise<void> {
  await run(file, args, { cwd: options.cwd })
}
