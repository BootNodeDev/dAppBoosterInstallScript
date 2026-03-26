import { describe, expect, it } from 'vitest'
import { featureDefinitions } from '../constants/config.js'
import {
  deriveStepDisplay,
  getPackagesToRemove,
  getPostInstallMessages,
  isFeatureSelected,
  isValidName,
} from '../utils/utils.js'

describe('isValidName', () => {
  it('accepts alphanumeric names', () => {
    expect(isValidName('myApp')).toBe(true)
    expect(isValidName('app123')).toBe(true)
    expect(isValidName('MyDapp')).toBe(true)
  })

  it('accepts underscores', () => {
    expect(isValidName('my_app')).toBe(true)
    expect(isValidName('_leading')).toBe(true)
    expect(isValidName('trailing_')).toBe(true)
  })

  it('rejects spaces', () => {
    expect(isValidName('my app')).toBe(false)
  })

  it('rejects hyphens', () => {
    expect(isValidName('my-app')).toBe(false)
  })

  it('rejects dots', () => {
    expect(isValidName('my.app')).toBe(false)
  })

  it('rejects special characters', () => {
    expect(isValidName('my@app')).toBe(false)
    expect(isValidName('my$app')).toBe(false)
    expect(isValidName('my;app')).toBe(false)
  })

  it('rejects empty string', () => {
    expect(isValidName('')).toBe(false)
  })
})

describe('isFeatureSelected', () => {
  it('returns true when feature is in the list', () => {
    expect(isFeatureSelected('demo', ['demo', 'subgraph'])).toBe(true)
  })

  it('returns false when feature is not in the list', () => {
    expect(isFeatureSelected('demo', ['subgraph', 'vocs'])).toBe(false)
  })

  it('returns false for empty list', () => {
    expect(isFeatureSelected('demo', [])).toBe(false)
  })
})

describe('getPackagesToRemove', () => {
  it('returns empty when all features selected', () => {
    const allFeatures = Object.keys(featureDefinitions) as Array<keyof typeof featureDefinitions>
    expect(getPackagesToRemove(allFeatures)).toEqual([])
  })

  it('returns all packages when no features selected', () => {
    const result = getPackagesToRemove([])

    const allPackages = Object.values(featureDefinitions).flatMap((def) => def.packages)
    expect(result).toEqual(allPackages)
  })

  it('returns packages only for deselected features', () => {
    const result = getPackagesToRemove(['demo', 'subgraph'])

    for (const pkg of featureDefinitions.subgraph.packages) {
      expect(result).not.toContain(pkg)
    }
    for (const pkg of featureDefinitions.typedoc.packages) {
      expect(result).toContain(pkg)
    }
  })

  it('handles demo (which has no packages) correctly', () => {
    const withDemo = getPackagesToRemove(['demo'])
    const withoutDemo = getPackagesToRemove([])
    expect(withDemo).toEqual(withoutDemo)
  })
})

describe('getPostInstallMessages', () => {
  it('returns all messages for full mode', () => {
    const result = getPostInstallMessages('full', [])

    const allMessages = Object.values(featureDefinitions).flatMap((def) => def.postInstall ?? [])
    expect(result).toEqual(allMessages)
  })

  it('returns only selected feature messages for custom mode', () => {
    const result = getPostInstallMessages('custom', ['subgraph'])

    expect(result).toEqual(featureDefinitions.subgraph.postInstall)
  })

  it('returns empty for custom mode with no postInstall features', () => {
    const result = getPostInstallMessages('custom', ['demo'])

    expect(result).toEqual([])
  })

  it('returns empty for custom mode with no features', () => {
    const result = getPostInstallMessages('custom', [])

    expect(result).toEqual([])
  })
})

describe('deriveStepDisplay', () => {
  it('shows all steps as completed when done', () => {
    const result = deriveStepDisplay(['Step 1', 'Step 2', 'Step 3'], 'done')

    expect(result.completedSteps).toEqual(['Step 1', 'Step 2', 'Step 3'])
    expect(result.currentStep).toBeUndefined()
    expect(result.failedStep).toBeUndefined()
  })

  it('shows last step as current when running', () => {
    const result = deriveStepDisplay(['Step 1', 'Step 2', 'Step 3'], 'running')

    expect(result.completedSteps).toEqual(['Step 1', 'Step 2'])
    expect(result.currentStep).toBe('Step 3')
    expect(result.failedStep).toBeUndefined()
  })

  it('shows last step as failed when error', () => {
    const result = deriveStepDisplay(['Step 1', 'Step 2', 'Step 3'], 'error')

    expect(result.completedSteps).toEqual(['Step 1', 'Step 2'])
    expect(result.currentStep).toBeUndefined()
    expect(result.failedStep).toBe('Step 3')
  })

  it('handles empty steps on error', () => {
    const result = deriveStepDisplay([], 'error')

    expect(result.completedSteps).toEqual([])
    expect(result.currentStep).toBeUndefined()
    expect(result.failedStep).toBeUndefined()
  })

  it('handles single step running', () => {
    const result = deriveStepDisplay(['Step 1'], 'running')

    expect(result.completedSteps).toEqual([])
    expect(result.currentStep).toBe('Step 1')
    expect(result.failedStep).toBeUndefined()
  })

  it('handles single step error', () => {
    const result = deriveStepDisplay(['Step 1'], 'error')

    expect(result.completedSteps).toEqual([])
    expect(result.currentStep).toBeUndefined()
    expect(result.failedStep).toBe('Step 1')
  })
})
