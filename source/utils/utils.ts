import { existsSync } from 'node:fs'
import { join } from 'node:path'
import process from 'node:process'
import {
  type FeatureName,
  type Stack,
  getDefaultFeatureNames,
  getFeatureNames,
  getStackConfig,
} from '../constants/config.js'
import type { InstallationType } from '../types/types.js'

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

// One-line summary of an install plan, shown on the interactive confirmation step before any disk
// work begins.
export function describeInstallPlan(
  stack: Stack,
  projectName: string,
  mode: InstallationType,
  selectedFeatures: FeatureName[],
): string {
  const stackLabel = getStackConfig(stack).label
  const head = `Stack: ${stackLabel} · Project: ${projectName}`

  if (mode === 'full') {
    return `${head} · Mode: full (all features)`
  }

  if (mode === 'default') {
    return `${head} · Mode: default (recommended)`
  }

  const features = selectedFeatures.length > 0 ? selectedFeatures.join(', ') : 'none'
  return `${head} · Mode: custom · Features: ${features}`
}

export function getPackagesToRemove(stack: Stack, selectedFeatures: FeatureName[]): string[] {
  const features = getStackConfig(stack).features
  return Object.entries(features)
    .filter(([name]) => !selectedFeatures.includes(name))
    .flatMap(([, def]) => def.packages)
}

export function getPostInstallMessages(
  stack: Stack,
  mode: InstallationType,
  selectedFeatures: FeatureName[],
): string[] {
  const config = getStackConfig(stack)
  const features = config.features
  const stackLevel = config.postInstall ?? []

  const kept = resolveModeFeatures(stack, mode, selectedFeatures)
  const featureMessages = kept.flatMap((name) => features[name]?.postInstall ?? [])
  return [...stackLevel, ...featureMessages]
}

// Resolves the kept-feature list for a mode: full → all, default → default:true set,
// custom → the user's selection (transitive requires resolved). Shared by the non-interactive
// path and the interactive Install/FileCleanup/PostInstall steps.
export function resolveModeFeatures(
  stack: Stack,
  mode: InstallationType,
  customSelection: FeatureName[] = [],
): FeatureName[] {
  if (mode === 'full') {
    return getFeatureNames(stack)
  }

  if (mode === 'default') {
    return getDefaultFeatureNames(stack)
  }

  return resolveSelectedFeatures(stack, customSelection)
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
