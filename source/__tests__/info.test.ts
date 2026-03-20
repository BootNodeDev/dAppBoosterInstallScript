import { describe, expect, it } from 'vitest'
import { featureDefinitions, featureNames } from '../constants/config.js'
import { getInfoOutput } from '../info.js'

describe('getInfoOutput', () => {
  it('returns valid JSON', () => {
    const raw = getInfoOutput()
    expect(() => JSON.parse(raw)).not.toThrow()
  })

  it('has features and modes top-level keys', () => {
    const output = JSON.parse(getInfoOutput())
    expect(output).toHaveProperty('features')
    expect(output).toHaveProperty('modes')
  })

  it('includes all defined features', () => {
    const output = JSON.parse(getInfoOutput())
    const outputFeatureNames = Object.keys(output.features)
    expect(outputFeatureNames).toEqual(featureNames)
  })

  it('each feature has description and default', () => {
    const output = JSON.parse(getInfoOutput())

    for (const name of featureNames) {
      expect(output.features[name]).toHaveProperty('description')
      expect(output.features[name]).toHaveProperty('default')
      expect(typeof output.features[name].description).toBe('string')
      expect(typeof output.features[name].default).toBe('boolean')
    }
  })

  it('includes postInstall only for features that have it', () => {
    const output = JSON.parse(getInfoOutput())

    for (const name of featureNames) {
      const def = featureDefinitions[name]

      if (def.postInstall) {
        expect(output.features[name].postInstall).toEqual(def.postInstall)
      } else {
        expect(output.features[name]).not.toHaveProperty('postInstall')
      }
    }
  })

  it('does not leak label or packages into output', () => {
    const output = JSON.parse(getInfoOutput())

    for (const name of featureNames) {
      expect(output.features[name]).not.toHaveProperty('label')
      expect(output.features[name]).not.toHaveProperty('packages')
    }
  })

  it('modes contains full and custom', () => {
    const output = JSON.parse(getInfoOutput())
    expect(output.modes).toHaveProperty('full')
    expect(output.modes).toHaveProperty('custom')
    expect(typeof output.modes.full).toBe('string')
    expect(typeof output.modes.custom).toBe('string')
  })
})
