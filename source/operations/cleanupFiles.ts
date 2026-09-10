import { readFileSync, statSync, writeFileSync } from 'node:fs'
import { copyFile, mkdir, rm } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import {
  type FeatureName,
  getFeatureEntries,
  getStackConfig,
  type Stack,
} from '../constants/config.js'
import type { InstallationType } from '../types/types.js'
import { isFeatureSelected } from '../utils/utils.js'

const HOME_FOLDER = 'src/components/pageComponents/home'

type DependencyGroup = Record<string, unknown> | undefined

type PackageJson = {
  scripts?: Record<string, string | undefined>
  workspaces?: string[] | { packages?: string[] }
  dependencies?: DependencyGroup
  devDependencies?: DependencyGroup
}

/**
 * What the deselected features leave for the package.json pass to apply.
 *
 * @property removedDirs - Directories that were deleted. Scripts that run one of them, and
 * workspaces entries that point at one, go with them.
 */
type CleanupPlan = {
  scripts: string[]
  removedDirs: string[]
}

function isDirectory(path: string): boolean {
  return statSync(path, { throwIfNoEntry: false })?.isDirectory() ?? false
}

async function removePaths(projectFolder: string, relativePaths: string[]): Promise<void> {
  await Promise.all(
    relativePaths.map((relativePath) =>
      rm(resolve(projectFolder, relativePath), { recursive: true, force: true }),
    ),
  )
}

/** Removes a feature's paths and reports which of them were directories. */
async function removeFeaturePaths(
  projectFolder: string,
  relativePaths: string[],
): Promise<string[]> {
  const directories = relativePaths.filter((relativePath) =>
    isDirectory(resolve(projectFolder, relativePath)),
  )

  await removePaths(projectFolder, relativePaths)

  return directories
}

/**
 * Deletes the files of every feature the user left out and collects what the package.json pass
 * still has to remove. `full` mode keeps everything.
 */
async function removeDeselectedFeatures(
  stack: Stack,
  projectFolder: string,
  mode: InstallationType,
  features: FeatureName[],
  onProgress?: (step: string) => void,
): Promise<CleanupPlan> {
  const plan: CleanupPlan = { scripts: [], removedDirs: [] }

  if (mode === 'full') {
    return plan
  }

  for (const [name, definition] of getFeatureEntries(stack)) {
    const { paths = [], scripts = [] } = definition

    if (isFeatureSelected(name, features) || (paths.length === 0 && scripts.length === 0)) {
      continue
    }

    onProgress?.(definition.label)
    plan.removedDirs.push(...(await removeFeaturePaths(projectFolder, paths)))
    plan.scripts.push(...scripts)
  }

  return plan
}

async function restoreFile(projectFolder: string, from: string, to: string): Promise<void> {
  const target = resolve(projectFolder, to)

  await mkdir(dirname(target), { recursive: true })
  await copyFile(resolve(projectFolder, from), target)
}

/**
 * Puts back the demo-free EVM home page the template stages in `.install-files`. Dropping `demo`
 * replaces the whole page; dropping only `subgraph` replaces the examples index that listed it.
 */
async function restoreEvmHomePage(projectFolder: string, features: FeatureName[]): Promise<void> {
  if (!isFeatureSelected('demo', features)) {
    await restoreFile(projectFolder, '.install-files/home/index.tsx', `${HOME_FOLDER}/index.tsx`)
    return
  }

  if (!isFeatureSelected('subgraph', features)) {
    await removePaths(projectFolder, [
      `${HOME_FOLDER}/Examples/demos/subgraphs`,
      `${HOME_FOLDER}/Examples/index.tsx`,
    ])
    await restoreFile(
      projectFolder,
      '.install-files/home/Examples/index.tsx',
      `${HOME_FOLDER}/Examples/index.tsx`,
    )
  }
}

function removeKeys(block: Record<string, unknown> | undefined, keys: string[]): boolean {
  if (!block) {
    return false
  }

  let changed = false

  for (const key of keys) {
    if (key in block) {
      delete block[key]
      changed = true
    }
  }

  return changed
}

function isUnderRemovedDir(path: string, removedDirs: string[]): boolean {
  return removedDirs.some((dir) => path === dir || path.startsWith(`${dir}/`))
}

/**
 * Names the scripts that run a removed directory, so cleanup tracks the removal even when the
 * template renames its scripts.
 */
function scriptsRunningRemovedDirs(
  scripts: Record<string, string | undefined> | undefined,
  removedDirs: string[],
): string[] {
  if (!scripts) {
    return []
  }

  return Object.entries(scripts)
    .filter(([, command]) =>
      command?.split(/\s+/).some((token) => isUnderRemovedDir(token, removedDirs)),
    )
    .map(([name]) => name)
}

/** Drops workspaces entries pointing at a removed directory. Mutates in place. */
function pruneWorkspaces(packageJson: PackageJson, removedDirs: string[]): boolean {
  const { workspaces } = packageJson
  const entries = Array.isArray(workspaces) ? workspaces : workspaces?.packages

  if (!entries) {
    return false
  }

  const kept = entries.filter((entry) => !isUnderRemovedDir(entry, removedDirs))

  if (kept.length === entries.length) {
    return false
  }

  if (Array.isArray(workspaces)) {
    packageJson.workspaces = kept
  } else if (workspaces) {
    workspaces.packages = kept
  }

  return true
}

/**
 * Applies the plan to the project's package.json in a single pass, writing only when something
 * changed. The dependencies themselves are left to the package manager, which runs next and
 * writes a lockfile matching whatever is left here.
 */
function patchPackageJson(projectFolder: string, plan: CleanupPlan): void {
  if (plan.scripts.length === 0 && plan.removedDirs.length === 0) {
    return
  }

  const packageJsonPath = resolve(projectFolder, 'package.json')

  let packageJson: PackageJson

  try {
    packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8')) as PackageJson
  } catch {
    return
  }

  const scriptsRemoved = removeKeys(packageJson.scripts, [
    ...plan.scripts,
    ...scriptsRunningRemovedDirs(packageJson.scripts, plan.removedDirs),
  ])

  const workspacesPruned = pruneWorkspaces(packageJson, plan.removedDirs)

  if (scriptsRemoved || workspacesPruned) {
    writeFileSync(packageJsonPath, `${JSON.stringify(packageJson, null, 2)}\n`)
  }
}

/**
 * Removes what the chosen features leave out and patches the project's package.json to match.
 * Runs before the install, so the package manager resolves the pruned manifest once and the
 * lockfile it writes needs no repair.
 */
export async function cleanupFiles(
  stack: Stack,
  projectFolder: string,
  mode: InstallationType,
  features: FeatureName[] = [],
  onProgress?: (step: string) => void,
): Promise<void> {
  const { hygiene, staging } = getStackConfig(stack)

  if (hygiene) {
    onProgress?.(hygiene.label)
    await removePaths(projectFolder, hygiene.paths)
  }

  const plan = await removeDeselectedFeatures(stack, projectFolder, mode, features, onProgress)

  if (stack === 'evm' && mode !== 'full') {
    await restoreEvmHomePage(projectFolder, features)
  }

  patchPackageJson(projectFolder, plan)

  if (staging) {
    onProgress?.(staging.label)
    await removePaths(projectFolder, staging.paths)
  }
}
