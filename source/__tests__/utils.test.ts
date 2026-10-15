import { describe, expect, it } from 'vitest'
import { getFeatureEntries, getFeatureNames, stackDefinitions } from '../stacks/index.js'
import {
  deriveStepDisplay,
  describeInstallPlan,
  getPackagesToRemove,
  getPostInstallMessages,
  isFeatureSelected,
  isValidName,
  resolveModeFeatures,
} from '../utils/utils.js'

const evmFeatures = stackDefinitions.evm.features

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

  it('accepts dashes, except to start', () => {
    expect(isValidName('my-app')).toBe(true)
    expect(isValidName('trailing-')).toBe(true)
    expect(isValidName('-leading')).toBe(false)
  })

  it('rejects a name git would read as an option', () => {
    expect(isValidName('--upload-pack=touch_pwned')).toBe(false)
    expect(isValidName('-rf')).toBe(false)
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
    const allFeatures = getFeatureNames('evm')
    expect(getPackagesToRemove('evm', allFeatures)).toEqual([])
  })

  it('returns all packages when no features selected', () => {
    const result = getPackagesToRemove('evm', [])

    const allPackages = Object.values(evmFeatures).flatMap((def) => def.packages)
    expect(result).toEqual(allPackages)
  })

  it('returns packages only for deselected features', () => {
    const result = getPackagesToRemove('evm', ['demo', 'subgraph'])

    for (const pkg of evmFeatures.subgraph.packages) {
      expect(result).not.toContain(pkg)
    }
    for (const pkg of evmFeatures.typedoc.packages) {
      expect(result).toContain(pkg)
    }
  })

  it('handles demo (which has no packages) correctly', () => {
    const withDemo = getPackagesToRemove('evm', ['demo'])
    const withoutDemo = getPackagesToRemove('evm', [])
    expect(withDemo).toEqual(withoutDemo)
  })
})

describe('getPostInstallMessages', () => {
  it('returns every message for a scaffold that kept every feature', () => {
    const result = getPostInstallMessages('evm', getFeatureNames('evm'))

    const allMessages = getFeatureEntries('evm').flatMap(([, def]) => def.postInstall ?? [])
    expect(result).toEqual(allMessages)
  })

  it('returns only the kept features messages', () => {
    const result = getPostInstallMessages('evm', ['subgraph'])

    expect(result).toEqual(evmFeatures.subgraph.postInstall)
  })

  it('returns empty when the kept features carry no guidance', () => {
    const result = getPostInstallMessages('evm', ['demo'])

    expect(result).toEqual([])
  })

  it('returns empty when nothing was kept', () => {
    const result = getPostInstallMessages('evm', [])

    expect(result).toEqual([])
  })
})

describe('describeInstallPlan', () => {
  it('returns one labelled setting per line, naming the mode as the selector did', () => {
    expect(describeInstallPlan('my_app', 'full', [])).toEqual([
      { label: 'Project', value: 'my_app' },
      { label: 'Mode', value: 'Full' },
    ])
  })

  it('lists the selected features for a custom-mode plan', () => {
    expect(describeInstallPlan('my_app', 'custom', ['demo', 'subgraph'])).toEqual([
      { label: 'Project', value: 'my_app' },
      { label: 'Mode', value: 'Custom' },
      { label: 'Features', value: 'demo, subgraph' },
    ])
  })

  it('shows "none" when a custom plan selects no features', () => {
    expect(describeInstallPlan('demo_app', 'custom', [])).toEqual([
      { label: 'Project', value: 'demo_app' },
      { label: 'Mode', value: 'Custom' },
      { label: 'Features', value: 'none' },
    ])
  })
})

describe('resolveModeFeatures', () => {
  it('returns all features for full mode', () => {
    expect(resolveModeFeatures('evm', 'full')).toEqual(getFeatureNames('evm'))
  })

  it('returns the custom selection in config order', () => {
    expect(resolveModeFeatures('evm', 'custom', ['subgraph', 'demo'])).toEqual(['demo', 'subgraph'])
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
