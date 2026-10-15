import { describe, expect, it } from 'vitest'
import {
  getDefaultFeatureNames,
  getFeatureNames,
  getInstallationModes,
  stackDefinitions,
} from '../stacks/index.js'

describe('getDefaultFeatureNames', () => {
  it('returns only features whose default flag is true, in config order', () => {
    const expected = Object.entries(stackDefinitions.evm.features)
      .filter(([, def]) => def.default)
      .map(([name]) => name)
    expect(getDefaultFeatureNames('evm')).toEqual(expected)
  })

  it('is a subset of all feature names', () => {
    const all = new Set(getFeatureNames('evm'))
    for (const name of getDefaultFeatureNames('evm')) {
      expect(all.has(name)).toBe(true)
    }
  })
})

describe('getInstallationModes', () => {
  it('offers full/custom for evm, where every feature is on by default', () => {
    expect(getInstallationModes('evm')).toEqual(['full', 'custom'])
  })
})
