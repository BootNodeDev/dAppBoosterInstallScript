import { describe, expect, it } from 'vitest'
import { defaultFeatureNames, featureDefinitions, featureNames } from '../config.js'

describe('defaultFeatureNames', () => {
  it('returns only features whose default flag is true, in config order', () => {
    const expected = Object.entries(featureDefinitions)
      .filter(([, def]) => def.default)
      .map(([name]) => name)
    expect(defaultFeatureNames).toEqual(expected)
  })

  it('is a subset of all feature names', () => {
    const all = new Set(featureNames)
    for (const name of defaultFeatureNames) {
      expect(all.has(name)).toBe(true)
    }
  })
})
