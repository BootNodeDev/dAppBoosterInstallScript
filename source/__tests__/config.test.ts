import { describe, expect, it } from 'vitest'
import {
  getDefaultFeatureNames,
  getFeatureNames,
  getInstallationModes,
  stackDefinitions,
} from '../constants/config.js'

describe('getDefaultFeatureNames', () => {
  it('returns only features whose default flag is true, in config order', () => {
    for (const stack of ['evm', 'canton'] as const) {
      const expected = Object.entries(stackDefinitions[stack].features)
        .filter(([, def]) => def.default)
        .map(([name]) => name)
      expect(getDefaultFeatureNames(stack)).toEqual(expected)
    }
  })

  it('is a subset of all feature names', () => {
    const all = new Set(getFeatureNames('canton'))
    for (const name of getDefaultFeatureNames('canton')) {
      expect(all.has(name)).toBe(true)
    }
  })
})

describe('getInstallationModes', () => {
  it('offers default/full/custom for canton', () => {
    expect(getInstallationModes('canton')).toEqual(['default', 'full', 'custom'])
  })

  it('offers only full/custom for evm', () => {
    expect(getInstallationModes('evm')).toEqual(['full', 'custom'])
  })
})
