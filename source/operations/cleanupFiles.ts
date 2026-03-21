import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import type { FeatureName } from '../constants/config.js'
import type { InstallationType } from '../types/types.js'
import { isFeatureSelected } from '../utils/utils.js'
import { execFile } from './exec.js'

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
  await execFile('rm', ['-rf', 'src/components/pageComponents/home'], { cwd: projectFolder })
  await execFile('mkdir', ['-p', 'src/components/pageComponents/home'], { cwd: projectFolder })
  await execFile('cp', ['.install-files/home/index.tsx', 'src/components/pageComponents/home/'], {
    cwd: projectFolder,
  })
}

async function cleanupSubgraph(projectFolder: string, features: FeatureName[]): Promise<void> {
  await execFile('rm', ['-rf', 'src/subgraphs'], { cwd: projectFolder })

  if (isFeatureSelected('demo', features)) {
    const homeFolder = 'src/components/pageComponents/home'

    await execFile('rm', ['-rf', `${homeFolder}/Examples/demos/subgraphs`], {
      cwd: projectFolder,
    })
    await execFile('rm', [`${homeFolder}/Examples/index.tsx`], { cwd: projectFolder })
    await execFile(
      'cp',
      ['.install-files/home/Examples/index.tsx', `${homeFolder}/Examples/index.tsx`],
      { cwd: projectFolder },
    )
  }
}

async function cleanupTypedoc(projectFolder: string): Promise<void> {
  await execFile('rm', ['typedoc.json'], { cwd: projectFolder })
}

async function cleanupVocs(projectFolder: string): Promise<void> {
  await execFile('rm', ['vocs.config.ts'], { cwd: projectFolder })
  await execFile('rm', ['-rf', 'docs'], { cwd: projectFolder })
}

async function cleanupHusky(projectFolder: string): Promise<void> {
  await execFile('rm', ['-rf', '.husky'], { cwd: projectFolder })
  await execFile('rm', ['.lintstagedrc.mjs'], { cwd: projectFolder })
  await execFile('rm', ['commitlint.config.js'], { cwd: projectFolder })
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
  await execFile('rm', ['-rf', '.install-files'], { cwd: projectFolder })
}
