import { readFileSync, statSync, writeFileSync } from 'node:fs'
import { copyFile, mkdir, rm } from 'node:fs/promises'
import { resolve } from 'node:path'
import {
  type FeatureName,
  getFeatureEntries,
  getStackConfig,
  type PackageManager,
  type Stack,
} from '../constants/config.js'
import type { InstallationType } from '../types/types.js'
import { isFeatureSelected } from '../utils/utils.js'
import { execFile } from './exec.js'

const EVM_HYGIENE_PATHS = ['.claude', 'AGENTS.md', 'CLAUDE.md', 'architecture.md', '.github']

const HOME_FOLDER = 'src/components/pageComponents/home'

const lockfileOnlyFlag: Record<PackageManager, string> = {
  npm: '--package-lock-only',
  pnpm: '--lockfile-only',
}

type DependencyGroup = Record<string, unknown> | undefined

type PackageJson = {
  scripts?: Record<string, string | undefined>
  workspaces?: string[] | { packages?: string[] }
  dependencies?: DependencyGroup
  devDependencies?: DependencyGroup
  optionalDependencies?: DependencyGroup
  peerDependencies?: DependencyGroup
}

/**
 * What the deselected features leave for the package.json pass to apply.
 *
 * @property removedDirs - Directories that were deleted. Scripts that run one of them, and
 * workspaces entries that point at one, go with them.
 */
type CleanupPlan = {
  scripts: string[]
  dependencies: string[]
  removedDirs: string[]
}

function isDirectory(path: string): boolean {
  try {
    return statSync(path).isDirectory()
  } catch {
    return false
  }
}

/** Deletes paths relative to the project folder. Returns the ones that were directories. */
async function removePaths(projectFolder: string, relativePaths: string[]): Promise<string[]> {
  const removedDirs: string[] = []

  for (const relativePath of relativePaths) {
    const target = resolve(projectFolder, relativePath)

    if (isDirectory(target)) {
      removedDirs.push(relativePath)
    }

    await rm(target, { recursive: true, force: true })
  }

  return removedDirs
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
  const plan: CleanupPlan = { scripts: [], dependencies: [], removedDirs: [] }

  if (mode === 'full') {
    return plan
  }

  for (const [name, definition] of getFeatureEntries(stack)) {
    const { paths = [], scripts = [], dependencies = [] } = definition

    if (isFeatureSelected(name, features)) {
      continue
    }

    if (paths.length === 0 && scripts.length === 0 && dependencies.length === 0) {
      continue
    }

    onProgress?.(definition.label)
    plan.removedDirs.push(...(await removePaths(projectFolder, paths)))
    plan.scripts.push(...scripts)
    plan.dependencies.push(...dependencies)
  }

  return plan
}

/** Replaces the EVM home page with the demo-free copy the template keeps in `.install-files`. */
async function restoreHomePage(projectFolder: string): Promise<void> {
  const homeFolder = resolve(projectFolder, HOME_FOLDER)

  await rm(homeFolder, { recursive: true, force: true })
  await mkdir(homeFolder, { recursive: true })
  await copyFile(
    resolve(projectFolder, '.install-files/home/index.tsx'),
    resolve(homeFolder, 'index.tsx'),
  )
}

/** Drops the subgraph demos from an EVM home page the user chose to keep. */
async function restoreExamplesIndex(projectFolder: string): Promise<void> {
  const homeFolder = resolve(projectFolder, HOME_FOLDER)

  await rm(resolve(homeFolder, 'Examples/demos/subgraphs'), { recursive: true, force: true })
  await rm(resolve(homeFolder, 'Examples/index.tsx'), { force: true })
  await copyFile(
    resolve(projectFolder, '.install-files/home/Examples/index.tsx'),
    resolve(homeFolder, 'Examples/index.tsx'),
  )
}

/**
 * EVM cleanup. The CI and agent metadata always go, since they belong to the template's own repo;
 * everything else follows the feature selection. Canton models both as optional features instead.
 */
async function cleanupEvmFiles(
  projectFolder: string,
  mode: InstallationType,
  features: FeatureName[],
  onProgress?: (step: string) => void,
): Promise<CleanupPlan> {
  onProgress?.('Repository metadata')
  await removePaths(projectFolder, EVM_HYGIENE_PATHS)

  if (mode === 'custom') {
    if (!isFeatureSelected('demo', features)) {
      onProgress?.('Component demos')
      await restoreHomePage(projectFolder)
    } else if (!isFeatureSelected('subgraph', features)) {
      onProgress?.('Subgraph demos')
      await restoreExamplesIndex(projectFolder)
    }
  }

  const plan = await removeDeselectedFeatures('evm', projectFolder, mode, features, onProgress)

  onProgress?.('Install script')
  await removePaths(projectFolder, ['.install-files'])

  return plan
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

function runsRemovedDir(command: string, removedDirs: string[]): boolean {
  const tokens = command.split(/\s+/)

  return removedDirs.some((dir) =>
    tokens.some((token) => token === dir || token.startsWith(`${dir}/`)),
  )
}

/**
 * Names the scripts that run a removed directory, so cleanup tracks the removal even when the
 * template renames its scripts.
 */
function scriptsRunningRemovedDirs(
  scripts: Record<string, string | undefined> | undefined,
  removedDirs: string[],
): string[] {
  if (!scripts || removedDirs.length === 0) {
    return []
  }

  return Object.entries(scripts)
    .filter(([, command]) => command !== undefined && runsRemovedDir(command, removedDirs))
    .map(([name]) => name)
}

/** Drops workspaces entries pointing at a removed directory. Mutates in place. */
function pruneWorkspaces(packageJson: PackageJson, removedDirs: string[]): boolean {
  const { workspaces } = packageJson
  const keep = (entry: string): boolean =>
    !removedDirs.some((dir) => entry === dir || entry.startsWith(`${dir}/`))

  if (Array.isArray(workspaces)) {
    const kept = workspaces.filter(keep)

    if (kept.length === workspaces.length) {
      return false
    }

    packageJson.workspaces = kept
    return true
  }

  if (workspaces && Array.isArray(workspaces.packages)) {
    const kept = workspaces.packages.filter(keep)

    if (kept.length === workspaces.packages.length) {
      return false
    }

    workspaces.packages = kept
    return true
  }

  return false
}

/**
 * Applies the plan to the project's package.json in a single pass, writing only when something
 * changed. Returns whether the lockfile no longer matches the manifest.
 */
function patchPackageJson(projectFolder: string, plan: CleanupPlan): boolean {
  const packageJsonPath = resolve(projectFolder, 'package.json')

  let packageJson: PackageJson

  try {
    packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8')) as PackageJson
  } catch {
    return false
  }

  const scriptsRemoved = removeKeys(packageJson.scripts, [
    ...plan.scripts,
    ...scriptsRunningRemovedDirs(packageJson.scripts, plan.removedDirs),
  ])

  const dependencyGroups: DependencyGroup[] = [
    packageJson.dependencies,
    packageJson.devDependencies,
    packageJson.optionalDependencies,
    packageJson.peerDependencies,
  ]

  let dependenciesRemoved = false

  for (const group of dependencyGroups) {
    if (removeKeys(group, plan.dependencies)) {
      dependenciesRemoved = true
    }
  }

  const workspacesPruned = pruneWorkspaces(packageJson, plan.removedDirs)

  if (scriptsRemoved || dependenciesRemoved || workspacesPruned) {
    writeFileSync(packageJsonPath, `${JSON.stringify(packageJson, null, 2)}\n`)
  }

  return dependenciesRemoved || workspacesPruned
}

/**
 * Rewrites the lockfile from the patched package.json, without installing anything. A failure here
 * leaves a project that still installs, so it is reported and not thrown.
 */
async function refreshLockfile(
  stack: Stack,
  projectFolder: string,
  onProgress?: (step: string) => void,
): Promise<void> {
  const { packageManager } = getStackConfig(stack)

  onProgress?.('Updating the lockfile')

  try {
    await execFile(packageManager, ['install', lockfileOnlyFlag[packageManager]], {
      cwd: projectFolder,
    })
  } catch {
    onProgress?.('Lockfile refresh skipped')
  }
}

async function createInitialCommit(projectFolder: string): Promise<void> {
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

/**
 * Removes what the chosen features leave out, then reconciles the project's package.json and
 * lockfile. Canton finishes with a baseline commit; `--no-verify` keeps the project's own hooks
 * from linting a tree the user has not touched yet.
 */
export async function cleanupFiles(
  stack: Stack,
  projectFolder: string,
  mode: InstallationType,
  features: FeatureName[] = [],
  onProgress?: (step: string) => void,
): Promise<void> {
  const plan =
    stack === 'canton'
      ? await removeDeselectedFeatures(stack, projectFolder, mode, features, onProgress)
      : await cleanupEvmFiles(projectFolder, mode, features, onProgress)

  if (patchPackageJson(projectFolder, plan)) {
    await refreshLockfile(stack, projectFolder, onProgress)
  }

  if (stack === 'canton') {
    onProgress?.('Initial commit')
    await createInitialCommit(projectFolder)
  }
}
