import { describe, expect, it } from 'vitest'
import { getInfoOutput } from '../info.js'
import { getFeatureEntries, getFeatureNames } from '../stacks/index.js'

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
    expect(Object.keys(output.features)).toEqual(getFeatureNames('evm'))
  })

  it('each feature has description and default', () => {
    const output = JSON.parse(getInfoOutput())

    for (const name of getFeatureNames('evm')) {
      const feature = output.features[name]
      expect(typeof feature.description).toBe('string')
      expect(typeof feature.default).toBe('boolean')
    }
  })

  it('includes postInstall only for features that declare it', () => {
    const output = JSON.parse(getInfoOutput())

    for (const [name, def] of getFeatureEntries('evm')) {
      const feature = output.features[name]
      if (def.postInstall) {
        expect(feature.postInstall).toEqual(def.postInstall)
      } else {
        expect(feature).not.toHaveProperty('postInstall')
      }
    }
  })

  it('surfaces requires only for features that declare a dependency', () => {
    const output = JSON.parse(getInfoOutput())

    for (const [name, def] of getFeatureEntries('evm')) {
      const feature = output.features[name]
      if (def.requires) {
        expect(feature.requires).toEqual(def.requires)
      } else {
        expect(feature).not.toHaveProperty('requires')
      }
    }
  })

  it('does not leak label, packages, or paths into feature output', () => {
    const output = JSON.parse(getInfoOutput())

    for (const name of getFeatureNames('evm')) {
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
