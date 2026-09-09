import { existsSync } from 'node:fs'
import { join } from 'node:path'
import process from 'node:process'
import {
  type FeatureName,
  getDefaultFeatureNames,
  getFeatureEntries,
  getFeatureNames,
  getStackConfig,
  isFeatureNameValid,
  type Stack,
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

/** Walks a feature's `requires` chain, adding every transitive requirement to `accumulator`. */
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
    if (!isFeatureNameValid(stack, required) || accumulator.has(required)) {
      continue
    }

    accumulator.add(required)
    collectRequiredFeatures(stack, required, accumulator)
  }
}

/** Features that depend on `target`, directly or through another one. They go when it goes. */
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

/** Expands a selection to include every transitive requirement, returned in config order. */
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

/**
 * Interactive toggle that keeps the selection consistent: selecting a feature pulls its
 * requirements in, unselecting one drops its dependents. Result is in config order.
 */
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

/** One-line summary of the plan, shown on the confirmation step before any disk work begins. */
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
  return getFeatureEntries(stack)
    .filter(([name]) => !selectedFeatures.includes(name))
    .flatMap(([, definition]) => definition.packages)
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

/**
 * The features a mode keeps: full → all of them, default → the ones on by default, custom → the
 * user's own selection. Both selections come back with their `requires` resolved. Shared by the
 * non-interactive path and the interactive steps.
 */
export function resolveModeFeatures(
  stack: Stack,
  mode: InstallationType,
  customSelection: FeatureName[] = [],
): FeatureName[] {
  if (mode === 'full') {
    return getFeatureNames(stack)
  }

  if (mode === 'default') {
    return resolveSelectedFeatures(stack, getDefaultFeatureNames(stack))
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
