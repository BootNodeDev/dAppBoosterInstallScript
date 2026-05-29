import { existsSync } from 'node:fs'
import { join } from 'node:path'
import process from 'node:process'
import { type FeatureName, type Stack, getStackConfig } from '../constants/config.js'

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

export function getPackagesToRemove(stack: Stack, selectedFeatures: FeatureName[]): string[] {
  const features = getStackConfig(stack).features
  return Object.entries(features)
    .filter(([name]) => !selectedFeatures.includes(name))
    .flatMap(([, def]) => def.packages)
}

export function getPostInstallMessages(
  stack: Stack,
  mode: 'full' | 'custom',
  selectedFeatures: FeatureName[],
): string[] {
  const features = getStackConfig(stack).features

  if (mode === 'full') {
    return Object.values(features).flatMap((def) => def.postInstall ?? [])
  }

  return selectedFeatures.flatMap((name) => features[name]?.postInstall ?? [])
}

export function projectDirectoryExists(projectName: string): boolean {
  return existsSync(getProjectFolder(projectName))
}

type StepStatus = 'running' | 'done' | 'error'

type StepDisplay = {
  completedSteps: string[]
  currentStep: string | undefined
  failedStep: string | undefined
}

export function deriveStepDisplay(steps: string[], status: StepStatus): StepDisplay {
  return {
    completedSteps: status === 'done' ? steps : steps.slice(0, -1),
    currentStep: status === 'running' ? steps.at(-1) : undefined,
    failedStep: status === 'error' ? steps.at(-1) : undefined,
  }
}
