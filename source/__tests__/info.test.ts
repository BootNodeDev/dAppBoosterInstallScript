import { describe, expect, it } from 'vitest'
import { featureEntries, featureNames } from '../config.js'
import { getInfoOutput } from '../info.js'

describe('getInfoOutput', () => {
  it('returns valid JSON', () => {
    expect(() => JSON.parse(getInfoOutput())).not.toThrow()
  })

  it('has features and modes top-level keys', () => {
    const output = JSON.parse(getInfoOutput())
    expect(Object.keys(output)).toEqual(['features', 'modes'])
  })

  it('lists every feature', () => {
    const output = JSON.parse(getInfoOutput())
    expect(Object.keys(output.features)).toEqual(featureNames)
  })

  it('each feature has description and default', () => {
    const output = JSON.parse(getInfoOutput())

    for (const name of featureNames) {
      const feature = output.features[name]
      expect(typeof feature.description).toBe('string')
      expect(typeof feature.default).toBe('boolean')
    }
  })

  it('includes postInstall only for features that declare it', () => {
    const output = JSON.parse(getInfoOutput())

    for (const [name, def] of featureEntries) {
      const feature = output.features[name]
      if (def.postInstall) {
        expect(feature.postInstall).toEqual(def.postInstall)
      } else {
        expect(feature).not.toHaveProperty('postInstall')
      }
    }
  })

  it('does not leak label, packages, or paths into feature output', () => {
    const output = JSON.parse(getInfoOutput())

    for (const name of featureNames) {
      const feature = output.features[name]
      expect(feature).not.toHaveProperty('label')
      expect(feature).not.toHaveProperty('packages')
      expect(feature).not.toHaveProperty('paths')
    }
  })

  it('documents exactly the full and custom modes', () => {
    const output = JSON.parse(getInfoOutput())
    expect(Object.keys(output.modes)).toEqual(['full', 'custom'])
  })
})
