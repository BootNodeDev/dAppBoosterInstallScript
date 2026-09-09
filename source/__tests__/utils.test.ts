import { describe, expect, it } from 'vitest'
import {
  getDefaultFeatureNames,
  getFeatureEntries,
  getFeatureNames,
  stackDefinitions,
  stackNames,
} from '../constants/config.js'
import {
  applyFeatureToggle,
  deriveStepDisplay,
  describeInstallPlan,
  getPackagesToRemove,
  getPostInstallMessages,
  isFeatureSelected,
  isValidName,
  resolveModeFeatures,
  resolveSelectedFeatures,
} from '../utils/utils.js'

const evmFeatures = stackDefinitions.evm.features
const cantonFeatures = stackDefinitions.canton.features

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

describe('getPackagesToRemove — evm', () => {
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

describe('getPackagesToRemove — canton', () => {
  it('returns empty when all canton features selected', () => {
    const allFeatures = getFeatureNames('canton')
    expect(getPackagesToRemove('canton', allFeatures)).toEqual([])
  })

  it('returns the pre-commit packages when that feature is dropped', () => {
    expect(getPackagesToRemove('canton', [])).toEqual(cantonFeatures.precommit.packages)
  })
})

describe('getPostInstallMessages', () => {
  it('returns every evm message for a scaffold that kept every feature', () => {
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

  it('leads canton guidance with the stack-level steps, then the kept features', () => {
    const result = getPostInstallMessages('canton', getFeatureNames('canton'))

    expect(result).toEqual([
      ...(stackDefinitions.canton.postInstall ?? []),
      ...(cantonFeatures.carpincho.postInstall ?? []),
    ])
  })

  it('returns the stack-level guidance for the recommended canton plan', () => {
    const result = getPostInstallMessages('canton', resolveModeFeatures('canton', 'default'))

    expect(result).toEqual([
      ...(stackDefinitions.canton.postInstall ?? []),
      ...(cantonFeatures.carpincho.postInstall ?? []),
    ])
  })

  it('returns only stack-level guidance for a plan without carpincho', () => {
    const result = getPostInstallMessages('canton', ['llm'])

    expect(result).toEqual(stackDefinitions.canton.postInstall ?? [])
  })
})

describe('resolveSelectedFeatures — canton (no requires)', () => {
  it('returns the selection unchanged, in config order', () => {
    expect(resolveSelectedFeatures('canton', ['llm', 'carpincho'])).toEqual(['carpincho', 'llm'])
  })

  it('leaves a single-feature selection unchanged', () => {
    expect(resolveSelectedFeatures('canton', ['github'])).toEqual(['github'])
  })
})

describe('resolveSelectedFeatures — evm (no requires)', () => {
  it('returns the selection unchanged, in config order', () => {
    expect(resolveSelectedFeatures('evm', ['subgraph', 'demo'])).toEqual(['demo', 'subgraph'])
  })
})

describe('describeInstallPlan', () => {
  it('summarises a full-mode canton plan as all features', () => {
    expect(describeInstallPlan('canton', 'my_app', 'full', [])).toBe(
      'Stack: Canton · Project: my_app · Mode: full (all features)',
    )
  })

  it('lists the selected features for a custom-mode plan', () => {
    expect(describeInstallPlan('canton', 'my_app', 'custom', ['github', 'carpincho'])).toBe(
      'Stack: Canton · Project: my_app · Mode: custom · Features: github, carpincho',
    )
  })

  it('shows "none" when a custom plan selects no features', () => {
    expect(describeInstallPlan('evm', 'demo_app', 'custom', [])).toBe(
      'Stack: EVM · Project: demo_app · Mode: custom · Features: none',
    )
  })
})

describe('describeInstallPlan — default mode', () => {
  it('summarises a default-mode plan as recommended', () => {
    expect(describeInstallPlan('canton', 'my_app', 'default', [])).toBe(
      'Stack: Canton · Project: my_app · Mode: default (recommended)',
    )
  })
})

describe('resolveModeFeatures', () => {
  it('returns all features for full mode', () => {
    expect(resolveModeFeatures('canton', 'full')).toEqual(getFeatureNames('canton'))
  })

  it('returns the default:true set for default mode', () => {
    expect(resolveModeFeatures('canton', 'default')).toEqual(getDefaultFeatureNames('canton'))
  })

  it('resolves requires for default mode too, not only for custom', () => {
    for (const stack of stackNames) {
      expect(resolveModeFeatures(stack, 'default')).toEqual(
        resolveSelectedFeatures(stack, getDefaultFeatureNames(stack)),
      )
    }
  })

  it('resolves the custom selection (no requires today, so identity in config order)', () => {
    expect(resolveModeFeatures('canton', 'custom', ['llm', 'carpincho'])).toEqual(
      resolveSelectedFeatures('canton', ['llm', 'carpincho']),
    )
  })
})

describe('applyFeatureToggle — canton (no dependencies)', () => {
  it('selecting a feature adds it in config order', () => {
    expect(applyFeatureToggle('canton', ['carpincho'], 'github', 'select')).toEqual([
      'github',
      'carpincho',
    ])
  })

  it('unselecting a feature removes only that feature', () => {
    expect(
      applyFeatureToggle('canton', ['github', 'carpincho', 'llm'], 'carpincho', 'unselect'),
    ).toEqual(['github', 'llm'])
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
