import { readFileSync, writeFileSync } from 'node:fs'
import { copyFile, mkdir, rm } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { featureEntries, prepare, staging } from '../config.js'
import type { FeatureName, InstallationType } from '../types/types.js'
import { isFeatureSelected } from '../utils/utils.js'

const HOME_FOLDER = 'src/components/pageComponents/home'

type PackageJson = {
  scripts?: Record<string, string | undefined>
}

async function removePaths(projectFolder: string, relativePaths: string[]): Promise<void> {
  await Promise.all(
    relativePaths.map((relativePath) =>
      rm(resolve(projectFolder, relativePath), { recursive: true, force: true }),
    ),
  )
}

/**
 * Deletes the files of every feature the user left out and returns the package.json scripts they
 * leave behind. `full` mode keeps everything.
 */
async function removeDeselectedFeatures(
  projectFolder: string,
  mode: InstallationType,
  features: FeatureName[],
  onProgress?: (step: string) => void,
): Promise<string[]> {
  const scripts: string[] = []

  if (mode === 'full') {
    return scripts
  }

  for (const [name, definition] of featureEntries) {
    const { paths = [], scripts: featureScripts = [] } = definition

    if (isFeatureSelected(name, features) || (paths.length === 0 && featureScripts.length === 0)) {
      continue
    }

    onProgress?.(definition.label)
    await removePaths(projectFolder, paths)
    scripts.push(...featureScripts)
  }

  return scripts
}

async function restoreFile(projectFolder: string, from: string, to: string): Promise<void> {
  const target = resolve(projectFolder, to)

  await mkdir(dirname(target), { recursive: true })
  await copyFile(resolve(projectFolder, from), target)
}

/**
 * Puts back the demo-free home page the template stages in its staging directory. Dropping `demo`
 * replaces the whole page; dropping only `subgraph` replaces the examples index that listed it.
 */
async function restoreStagedHomePage(
  projectFolder: string,
  features: FeatureName[],
): Promise<void> {
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

/**
 * Removes the given scripts from the project's package.json in a single pass, writing only when
 * something changed. Feature dependencies are left to the package manager, which runs next.
 */
function patchPackageJson(projectFolder: string, scripts: string[]): void {
  if (scripts.length === 0) {
    return
  }

  const packageJsonPath = resolve(projectFolder, 'package.json')

  let packageJson: PackageJson

  try {
    packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8')) as PackageJson
  } catch {
    return
  }

  if (removeKeys(packageJson.scripts, scripts)) {
    writeFileSync(packageJsonPath, `${JSON.stringify(packageJson, null, 2)}\n`)
  }
}

/**
 * Removes what the template keeps for itself and what the chosen features leave out, then patches
 * the project's package.json to match. Runs before the install, so the package manager resolves
 * the pruned manifest once and the lockfile it writes needs no repair.
 */
export async function cleanupFiles(
  projectFolder: string,
  mode: InstallationType,
  features: FeatureName[] = [],
  onProgress?: (step: string) => void,
): Promise<void> {
  onProgress?.(prepare.label)
  await removePaths(projectFolder, prepare.paths)

  const scripts = await removeDeselectedFeatures(projectFolder, mode, features, onProgress)

  if (mode !== 'full') {
    await restoreStagedHomePage(projectFolder, features)
  }

  patchPackageJson(projectFolder, scripts)

  onProgress?.(staging.label)
  await removePaths(projectFolder, staging.paths)
}
