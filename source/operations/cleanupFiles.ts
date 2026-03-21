import { readFileSync, writeFileSync } from 'node:fs'
import { copyFile, mkdir, rm } from 'node:fs/promises'
import { resolve } from 'node:path'
import type { FeatureName } from '../constants/config.js'
import type { InstallationType } from '../types/types.js'
import { isFeatureSelected } from '../utils/utils.js'

function patchPackageJson(projectFolder: string, features: FeatureName[]): void {
  const packageJsonPath = resolve(projectFolder, 'package.json')
  const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8'))

  if (!isFeatureSelected('subgraph', features)) {
    packageJson.scripts['subgraph-codegen'] = undefined
  }

  if (!isFeatureSelected('typedoc', features)) {
    packageJson.scripts['typedoc:build'] = undefined
  }

  if (!isFeatureSelected('vocs', features)) {
    packageJson.scripts['docs:build'] = undefined
    packageJson.scripts['docs:dev'] = undefined
    packageJson.scripts['docs:preview'] = undefined
  }

  if (!isFeatureSelected('husky', features)) {
    packageJson.scripts.prepare = undefined
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

export async function cleanupFiles(
  projectFolder: string,
  mode: InstallationType,
  features: FeatureName[] = [],
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

    patchPackageJson(projectFolder, features)
  }

  onProgress?.('Install script')
  await rm(resolve(projectFolder, '.install-files'), { recursive: true, force: true })
}
