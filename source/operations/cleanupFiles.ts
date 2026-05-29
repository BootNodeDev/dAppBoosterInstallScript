import { readFileSync, writeFileSync } from 'node:fs'
import { copyFile, mkdir, rm } from 'node:fs/promises'
import { resolve } from 'node:path'
import { type FeatureName, type Stack, getStackConfig } from '../constants/config.js'
import type { InstallationType } from '../types/types.js'
import { isFeatureSelected } from '../utils/utils.js'

function patchPackageJsonEvm(projectFolder: string, features: FeatureName[]): void {
  const packageJsonPath = resolve(projectFolder, 'package.json')
  const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8'))
  const scripts = packageJson.scripts as Record<string, string | undefined> | undefined

  if (!scripts) {
    writeFileSync(packageJsonPath, `${JSON.stringify(packageJson, null, 2)}\n`)
    return
  }

  if (!isFeatureSelected('subgraph', features)) {
    scripts['subgraph-codegen'] = undefined
  }

  if (!isFeatureSelected('typedoc', features)) {
    scripts['typedoc:build'] = undefined
  }

  if (!isFeatureSelected('vocs', features)) {
    scripts['docs:build'] = undefined
    scripts['docs:dev'] = undefined
    scripts['docs:preview'] = undefined
  }

  if (!isFeatureSelected('husky', features)) {
    // biome-ignore lint/complexity/useLiteralKeys: index-signature type requires bracket access
    scripts['prepare'] = undefined
  }

  writeFileSync(packageJsonPath, `${JSON.stringify(packageJson, null, 2)}\n`)
}

// Strip scripts by what they run (e.g. `npm --prefix counter/frontend ...`)
// rather than by name, so cleanup tracks directory removal even as scripts change.
function scriptTargetsRemovedDir(command: string, removedDirs: string[]): boolean {
  const tokens = command.split(/\s+/)
  return removedDirs.some((dir) =>
    tokens.some((token) => token === dir || token.startsWith(`${dir}/`)),
  )
}

function patchPackageJsonCanton(projectFolder: string, removedDirs: string[]): void {
  const packageJsonPath = resolve(projectFolder, 'package.json')
  const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8'))
  const scripts = packageJson.scripts as Record<string, string | undefined> | undefined

  if (!scripts) {
    writeFileSync(packageJsonPath, `${JSON.stringify(packageJson, null, 2)}\n`)
    return
  }

  for (const [name, command] of Object.entries(scripts)) {
    if (command !== undefined && scriptTargetsRemovedDir(command, removedDirs)) {
      scripts[name] = undefined
    }
  }

  writeFileSync(packageJsonPath, `${JSON.stringify(packageJson, null, 2)}\n`)
}

async function cleanupDemo(projectFolder: string): Promise<void> {
  const homeFolder = resolve(projectFolder, 'src/components/pageComponents/home')
  await rm(homeFolder, { recursive: true, force: true })
  await mkdir(homeFolder, { recursive: true })
  await copyFile(
    resolve(projectFolder, '.install-files/home/index.tsx'),
    resolve(homeFolder, 'index.tsx'),
  )
}

async function cleanupSubgraph(projectFolder: string, features: FeatureName[]): Promise<void> {
  await rm(resolve(projectFolder, 'src/subgraphs'), { recursive: true, force: true })

  if (isFeatureSelected('demo', features)) {
    const homeFolder = resolve(projectFolder, 'src/components/pageComponents/home')

    await rm(resolve(homeFolder, 'Examples/demos/subgraphs'), { recursive: true, force: true })
    await rm(resolve(homeFolder, 'Examples/index.tsx'), { force: true })
    await copyFile(
      resolve(projectFolder, '.install-files/home/Examples/index.tsx'),
      resolve(homeFolder, 'Examples/index.tsx'),
    )
  }
}

async function cleanupTypedoc(projectFolder: string): Promise<void> {
  await rm(resolve(projectFolder, 'typedoc.json'), { force: true })
}

async function cleanupVocs(projectFolder: string): Promise<void> {
  await rm(resolve(projectFolder, 'vocs.config.ts'), { force: true })
  await rm(resolve(projectFolder, 'docs'), { recursive: true, force: true })
}

async function cleanupHusky(projectFolder: string): Promise<void> {
  await rm(resolve(projectFolder, '.husky'), { recursive: true, force: true })
  await rm(resolve(projectFolder, '.lintstagedrc.mjs'), { force: true })
  await rm(resolve(projectFolder, 'commitlint.config.js'), { force: true })
}

async function cleanupCounter(projectFolder: string): Promise<void> {
  await rm(resolve(projectFolder, 'counter'), { recursive: true, force: true })
}

async function cleanupE2e(projectFolder: string): Promise<void> {
  await rm(resolve(projectFolder, 'e2e'), { recursive: true, force: true })
}

async function cleanupEvmFiles(
  projectFolder: string,
  mode: InstallationType,
  features: FeatureName[],
  onProgress?: (step: string) => void,
): Promise<void> {
  if (mode === 'custom') {
    if (!isFeatureSelected('demo', features)) {
      onProgress?.('Component demos')
      await cleanupDemo(projectFolder)
    }

    if (!isFeatureSelected('subgraph', features)) {
      onProgress?.('Subgraph')
      await cleanupSubgraph(projectFolder, features)
    }

    if (!isFeatureSelected('typedoc', features)) {
      onProgress?.('Typedoc')
      await cleanupTypedoc(projectFolder)
    }

    if (!isFeatureSelected('vocs', features)) {
      onProgress?.('Vocs')
      await cleanupVocs(projectFolder)
    }

    if (!isFeatureSelected('husky', features)) {
      onProgress?.('Husky')
      await cleanupHusky(projectFolder)
    }

    patchPackageJsonEvm(projectFolder, features)
  }

  onProgress?.('Install script')
  await rm(resolve(projectFolder, '.install-files'), { recursive: true, force: true })
}

async function cleanupCantonFiles(
  projectFolder: string,
  mode: InstallationType,
  features: FeatureName[],
  alwaysRemovedDirs: string[],
  onProgress?: (step: string) => void,
): Promise<void> {
  // Clone-time removals (e.g. carpincho-wallet) apply in every mode; deselected
  // feature directories add to the set only in custom mode.
  const removedDirs = [...alwaysRemovedDirs]

  if (mode === 'custom') {
    if (!isFeatureSelected('counter', features)) {
      onProgress?.('Counter demo')
      await cleanupCounter(projectFolder)
      removedDirs.push('counter')
    }

    if (!isFeatureSelected('e2e', features)) {
      onProgress?.('E2E tests')
      await cleanupE2e(projectFolder)
      removedDirs.push('e2e')
    }
  }

  patchPackageJsonCanton(projectFolder, removedDirs)
}

export async function cleanupFiles(
  stack: Stack,
  projectFolder: string,
  mode: InstallationType,
  features: FeatureName[] = [],
  onProgress?: (step: string) => void,
): Promise<void> {
  if (stack === 'canton') {
    const { removeAfterClone } = getStackConfig(stack)
    await cleanupCantonFiles(projectFolder, mode, features, removeAfterClone, onProgress)
    return
  }

  await cleanupEvmFiles(projectFolder, mode, features, onProgress)
}
