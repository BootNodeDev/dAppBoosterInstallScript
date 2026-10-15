import process from 'node:process'
import type {
  FeatureDefinition,
  FeatureName,
  InstallationType,
  Stack,
  StackConfig,
} from '../types/types.js'
import { evm } from './evm.js'

export const stackDefinitions = { evm } satisfies Record<Stack, StackConfig>

function envOverride(suffix: 'REPO_URL' | 'REF'): string | undefined {
  const value = process.env[`DAPPBOOSTER_${suffix}`]
  return value && value.length > 0 ? value : undefined
}

export function getStackConfig(stack: Stack): StackConfig {
  const base: StackConfig = stackDefinitions[stack]
  const repoUrl = envOverride('REPO_URL') ?? base.repoUrl
  const ref = envOverride('REF') ?? base.ref
  return { ...base, repoUrl, ref }
}

/** A stack's feature map as entries. The keys are feature names by construction. */
export function getFeatureEntries(stack: Stack): Array<[FeatureName, FeatureDefinition]> {
  return Object.entries(stackDefinitions[stack].features) as Array<[FeatureName, FeatureDefinition]>
}

export function getFeatureNames(stack: Stack): FeatureName[] {
  return getFeatureEntries(stack).map(([name]) => name)
}

export function isFeatureNameValid(stack: Stack, name: string): name is FeatureName {
  return name in stackDefinitions[stack].features
}

export function getDefaultFeatureNames(stack: Stack): FeatureName[] {
  return getFeatureEntries(stack)
    .filter(([, definition]) => definition.default)
    .map(([name]) => name)
}

/**
 * Installation modes a stack offers. `default` (keep only the `default: true` features) needs at
 * least one opt-out feature, or it would be identical to `full`.
 */
export function getInstallationModes(stack: Stack): InstallationType[] {
  const hasOptOutFeature = getDefaultFeatureNames(stack).length < getFeatureNames(stack).length
  return hasOptOutFeature ? ['default', 'full', 'custom'] : ['full', 'custom']
}
