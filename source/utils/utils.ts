import { existsSync } from 'node:fs'
import { join } from 'node:path'
import process from 'node:process'
import { type FeatureName, featureDefinitions } from '../constants/config.js'

export function getProjectFolder(projectName: string) {
  return join(process.cwd(), projectName)
}

export function isValidName(name: string) {
  return /^[a-zA-Z0-9_]+$/.test(name)
}

export function isAnswerConfirmed(answer?: string, errorMessage?: string): boolean {
  return (
    answer !== '' && answer !== undefined && (errorMessage === '' || errorMessage === undefined)
  )
}

export function canShowStep(currentStep: number, stepToShow: number) {
  return currentStep > stepToShow - 1
}

export function isFeatureSelected(feature: FeatureName, selectedFeatures: FeatureName[]): boolean {
  return selectedFeatures.includes(feature)
}

export function getPackagesToRemove(selectedFeatures: FeatureName[]): string[] {
  return Object.entries(featureDefinitions)
    .filter(([name]) => !selectedFeatures.includes(name as FeatureName))
    .flatMap(([, def]) => def.packages)
}

export function getPostInstallMessages(
  mode: 'full' | 'custom',
  selectedFeatures: FeatureName[],
): string[] {
  if (mode === 'full') {
    return Object.values(featureDefinitions).flatMap((def) => def.postInstall ?? [])
  }

  return selectedFeatures.flatMap((name) => featureDefinitions[name]?.postInstall ?? [])
}

export function projectDirectoryExists(projectName: string): boolean {
  return existsSync(getProjectFolder(projectName))
}
