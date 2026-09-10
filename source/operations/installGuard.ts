import { rmSync } from 'node:fs'
import process from 'node:process'

/**
 * The project folder being scaffolded right now, so an interrupt or a failure can remove the
 * partial directory. Only ever holds a folder the installer created this run — callers check that
 * the directory did not exist before starting — so removing it never touches the user's own files.
 */
let activeProjectFolder: string | undefined
let signalHandlersRegistered = false

type RemoveDirectory = (path: string, options: { recursive: boolean; force: boolean }) => void

/**
 * Removes the in-progress project folder, if any, then clears the active reference so a finished
 * or already-removed project is never deleted. `rm` is injectable for testing.
 */
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
  process.exit(signal === 'SIGTERM' ? 143 : 130)
}

/** Marks the start of disk-writing work. Registers interrupt handlers on first use. */
export function beginInstall(projectFolder: string): void {
  activeProjectFolder = projectFolder

  if (!signalHandlersRegistered) {
    process.on('SIGINT', handleAbort)
    process.on('SIGTERM', handleAbort)
    signalHandlersRegistered = true
  }
}

/** Marks the scaffold complete; an interrupt after this point leaves the finished project intact. */
export function completeInstall(): void {
  activeProjectFolder = undefined
}

/**
 * Gives up on a scaffold that failed: the partial directory goes, and the process reports failure
 * to whatever called it.
 */
export function abortInstall(): void {
  removeActiveProject()
  process.exitCode = 1
}
