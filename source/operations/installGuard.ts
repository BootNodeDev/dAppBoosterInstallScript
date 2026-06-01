import { rmSync } from 'node:fs'
import process from 'node:process'

// Tracks the project folder currently being scaffolded so an interrupt can remove the partial
// directory. Only ever holds a folder the installer created this run (callers validate that the
// directory did not exist before starting), so removing it on abort never touches user data.
let activeProjectFolder: string | undefined
let signalHandlersRegistered = false

type RemoveDirectory = (path: string, options: { recursive: boolean; force: boolean }) => void

// Removes the in-progress project folder, if any, then clears the active reference so a finished
// or already-removed project is never deleted. `rm` is injectable for testing.
export function removeActiveProject(rm: RemoveDirectory = rmSync): void {
  if (activeProjectFolder === undefined) {
    return
  }

  const folder = activeProjectFolder
  activeProjectFolder = undefined
  rm(folder, { recursive: true, force: true })
}

function handleAbort(signal: NodeJS.Signals): void {
  removeActiveProject()
  // Conventional exit code for a signal is 128 + signal number (SIGINT 2 → 130, SIGTERM 15 → 143).
  process.exit(signal === 'SIGTERM' ? 143 : 130)
}

// Marks the start of disk-writing work. Registers interrupt handlers on first use.
export function beginInstall(projectFolder: string): void {
  activeProjectFolder = projectFolder

  if (!signalHandlersRegistered) {
    process.on('SIGINT', handleAbort)
    process.on('SIGTERM', handleAbort)
    signalHandlersRegistered = true
  }
}

// Marks the scaffold complete; an interrupt after this point leaves the finished project intact.
export function completeInstall(): void {
  activeProjectFolder = undefined
}
