import { existsSync } from 'node:fs'
import { join } from 'node:path'
import process from 'node:process'
import {
  type FeatureName,
  type Stack,
  getFeatureNames,
  getStackConfig,
} from '../constants/config.js'

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

type FeatureToggleAction = 'select' | 'unselect'

// Walks a feature's `requires` chain, adding every (transitive) requirement to `accumulator`.
function collectRequiredFeatures(
  stack: Stack,
  feature: FeatureName,
  accumulator: Set<FeatureName>,
): void {
  const definition = getStackConfig(stack).features[feature]
  if (!definition?.requires) {
    return
  }

  for (const required of definition.requires) {
    if (!accumulator.has(required)) {
      accumulator.add(required)
      collectRequiredFeatures(stack, required, accumulator)
    }
  }
}

// Features that depend (transitively) on `target` — removing `target` should remove these too.
function getDependentFeatures(stack: Stack, target: FeatureName): Set<FeatureName> {
  const dependents = new Set<FeatureName>()

  for (const name of getFeatureNames(stack)) {
    const required = new Set<FeatureName>()
    collectRequiredFeatures(stack, name, required)
    if (required.has(target)) {
      dependents.add(name)
    }
  }

  return dependents
}

// Expands a selection to include every transitive requirement, returned in config order.
export function resolveSelectedFeatures(
  stack: Stack,
  selectedFeatures: FeatureName[],
): FeatureName[] {
  const resolved = new Set<FeatureName>(selectedFeatures)
  for (const feature of selectedFeatures) {
    collectRequiredFeatures(stack, feature, resolved)
  }

  return getFeatureNames(stack).filter((name) => resolved.has(name))
}

// Interactive toggle that keeps the selection dependency-consistent: selecting a feature pulls
// its requirements in; unselecting one cascades its dependents out. Result is in config order.
export function applyFeatureToggle(
  stack: Stack,
  selectedFeatures: FeatureName[],
  toggledFeature: FeatureName,
  action: FeatureToggleAction,
): FeatureName[] {
  if (action === 'select') {
    return resolveSelectedFeatures(stack, [...selectedFeatures, toggledFeature])
  }

  const toRemove = getDependentFeatures(stack, toggledFeature)
  toRemove.add(toggledFeature)

  return getFeatureNames(stack).filter(
    (name) => selectedFeatures.includes(name) && !toRemove.has(name),
  )
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
