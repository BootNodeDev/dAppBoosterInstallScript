import { existsSync } from 'node:fs'
import { join } from 'node:path'
import process from 'node:process'
import { getFeatureEntries, getFeatureNames, getStackConfig } from '../stacks/index.js'
import type { FeatureName, InstallationType, PlanSummaryItem, Stack } from '../types/types.js'

export function getProjectFolder(projectName: string) {
  return join(process.cwd(), projectName)
}

export function isValidName(name: string) {
  return /^[a-zA-Z0-9_][a-zA-Z0-9_-]*$/.test(name)
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

/** How each mode is named on screen, in the selector and in the review that follows it. */
export const MODE_LABELS: Record<InstallationType, string> = {
  full: 'Full',
  custom: 'Custom',
}

/** The plan as one item per setting, shown on the confirmation step before any disk work begins. */
export function describeInstallPlan(
  projectName: string,
  mode: InstallationType,
  selectedFeatures: FeatureName[],
): PlanSummaryItem[] {
  const items: PlanSummaryItem[] = [
    { label: 'Project', value: projectName },
    { label: 'Mode', value: MODE_LABELS[mode] },
  ]

  if (mode !== 'custom') {
    return items
  }

  const features = selectedFeatures.length > 0 ? selectedFeatures.join(', ') : 'none'
  return [...items, { label: 'Features', value: features }]
}

export function getPackagesToRemove(stack: Stack, selectedFeatures: FeatureName[]): string[] {
  return getFeatureEntries(stack)
    .filter(([name]) => !selectedFeatures.includes(name))
    .flatMap(([, definition]) => definition.packages)
}

/** Post-install guidance for a scaffold: that of each feature it kept. */
export function getPostInstallMessages(stack: Stack, features: FeatureName[]): string[] {
  const config = getStackConfig(stack)
  return features.flatMap((name) => config.features[name]?.postInstall ?? [])
}

/**
 * The features a mode keeps, in config order: full → all of them, custom → the user's own
 * selection. Shared by the non-interactive path and the interactive steps.
 */
export function resolveModeFeatures(
  stack: Stack,
  mode: InstallationType,
  customSelection: FeatureName[] = [],
): FeatureName[] {
  const names = getFeatureNames(stack)
  return mode === 'full' ? names : names.filter((name) => customSelection.includes(name))
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
