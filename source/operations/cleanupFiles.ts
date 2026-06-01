import { readFileSync, writeFileSync } from 'node:fs'
import { copyFile, mkdir, rm } from 'node:fs/promises'
import { resolve } from 'node:path'
import { type FeatureName, type Stack, getStackConfig } from '../constants/config.js'
import type { InstallationType } from '../types/types.js'
import { isFeatureSelected } from '../utils/utils.js'
import { execFile } from './exec.js'

// CI config is hygiene for both stacks. EVM additionally always strips its agent/LLM metadata;
// Canton keeps that metadata under the optional `llm` feature instead.
const CI_PATHS = ['.github']

const EVM_METADATA_PATHS = ['.claude', 'AGENTS.md', 'CLAUDE.md', 'architecture.md']

const AUTOMATION_PATHS = ['.husky', '.lintstagedrc.mjs', 'commitlint.config.js']

const TOOLING_PACKAGES_TO_REMOVE = [
  'husky',
  'lint-staged',
  '@commitlint/cli',
  '@commitlint/config-conventional',
]

const TOOLING_SCRIPTS_TO_REMOVE = ['prepare', 'commitlint', 'commitlint:check', 'commitlint:ci']

function removePackageKeys(
  packageBlock: Record<string, unknown> | undefined,
  keys: string[],
): boolean {
  if (!packageBlock) {
    return false
  }

  let changed = false
  for (const key of keys) {
    if (key in packageBlock) {
      delete packageBlock[key]
      changed = true
    }
  }

  return changed
}

function sanitizeRepositoryPackageJson(projectFolder: string): void {
  const packageJsonPath = resolve(projectFolder, 'package.json')

  try {
    const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8'))
    const scripts = packageJson.scripts as Record<string, string | undefined> | undefined
    let changed = false

    if (scripts) {
      for (const scriptName of TOOLING_SCRIPTS_TO_REMOVE) {
        if (scripts[scriptName] !== undefined) {
          scripts[scriptName] = undefined
          changed = true
        }
      }
    }

    const dependencyGroups: Array<Record<string, unknown> | undefined> = [
      packageJson.dependencies,
      packageJson.devDependencies,
      packageJson.optionalDependencies,
      packageJson.peerDependencies,
    ]

    for (const group of dependencyGroups) {
      if (removePackageKeys(group, TOOLING_PACKAGES_TO_REMOVE)) {
        changed = true
      }
    }

    if (changed) {
      writeFileSync(packageJsonPath, `${JSON.stringify(packageJson, null, 2)}\n`)
    }
  } catch {
    // Some templates may not include a package.json at this level.
  }
}

async function removePaths(projectFolder: string, relativePaths: string[]): Promise<void> {
  for (const relativePath of relativePaths) {
    await rm(resolve(projectFolder, relativePath), { recursive: true, force: true })
  }
}

async function cleanupRepositoryHygiene(
  stack: Stack,
  projectFolder: string,
  onProgress?: (step: string) => void,
): Promise<void> {
  onProgress?.('Repository metadata')
  const metadataPaths = stack === 'evm' ? [...EVM_METADATA_PATHS, ...CI_PATHS] : CI_PATHS
  await removePaths(projectFolder, metadataPaths)

  onProgress?.('Git hooks and commit linting')
  await removePaths(projectFolder, AUTOMATION_PATHS)

  sanitizeRepositoryPackageJson(projectFolder)
}

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

  // biome-ignore lint/complexity/useLiteralKeys: TS index-signature compatibility in strict mode
  scripts['prepare'] = undefined
  // biome-ignore lint/complexity/useLiteralKeys: TS index-signature compatibility in strict mode
  scripts['commitlint'] = undefined
  scripts['commitlint:check'] = undefined
  scripts['commitlint:ci'] = undefined

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

  // biome-ignore lint/complexity/useLiteralKeys: TS index-signature compatibility in strict mode
  scripts['prepare'] = undefined
  // biome-ignore lint/complexity/useLiteralKeys: TS index-signature compatibility in strict mode
  scripts['commitlint'] = undefined
  scripts['commitlint:check'] = undefined
  scripts['commitlint:ci'] = undefined

  writeFileSync(packageJsonPath, `${JSON.stringify(packageJson, null, 2)}\n`)
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
      '-m',
      'chore: initial commit',
    ],
    { cwd: projectFolder },
  )
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

    patchPackageJsonEvm(projectFolder, features)
  }

  onProgress?.('Install script')
  await rm(resolve(projectFolder, '.install-files'), { recursive: true, force: true })
}

async function cleanupCantonFiles(
  projectFolder: string,
  mode: InstallationType,
  features: FeatureName[],
  onProgress?: (step: string) => void,
): Promise<void> {
  const cantonFeatures = getStackConfig('canton').features

  // Each deselected feature contributes its paths to removal (custom mode only). Directory paths
  // also feed script stripping, so a removed feature's package.json scripts disappear with it.
  const removedDirs: string[] = []

  if (mode === 'custom') {
    for (const [name, definition] of Object.entries(cantonFeatures)) {
      if (isFeatureSelected(name, features) || !definition.paths || definition.paths.length === 0) {
        continue
      }

      onProgress?.(definition.label)
      await removePaths(projectFolder, definition.paths)
      removedDirs.push(...definition.paths)
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
  await cleanupRepositoryHygiene(stack, projectFolder, onProgress)

  if (stack === 'canton') {
    await cleanupCantonFiles(projectFolder, mode, features, onProgress)
    onProgress?.('Initial commit')
    await createInitialCommit(projectFolder)
    return
  }

  await cleanupEvmFiles(projectFolder, mode, features, onProgress)
}
