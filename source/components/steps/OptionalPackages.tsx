import { Text } from 'ink'
import { type FC, useCallback, useEffect, useMemo, useState } from 'react'
import { type FeatureName, type Stack, getStackConfig } from '../../constants/config.js'
import type { MultiSelectItem } from '../../types/types.js'
import { applyFeatureToggle } from '../../utils/utils.js'
import MultiSelect from '../Multiselect/index.js'

interface Props {
  stack: Stack
  onCompletion: () => void
  onSubmit: (selectedItems: Array<MultiSelectItem>) => void
  skip?: boolean
}

const OptionalPackages: FC<Props> = ({ stack, onCompletion, onSubmit, skip = false }) => {
  const [submitted, setSubmitted] = useState<Array<MultiSelectItem>>()

  const customPackages: Array<MultiSelectItem> = useMemo(() => {
    const features = getStackConfig(stack).features
    return Object.entries(features).map(([name, def]) => ({
      label: def.label,
      value: name,
    }))
  }, [stack])

  // Pre-check only default:true features (e.g. Canton's github/precommit start unchecked).
  const defaultSelected: Array<MultiSelectItem> = useMemo(() => {
    const features = getStackConfig(stack).features
    return customPackages.filter((pkg) => features[pkg.value as FeatureName]?.default)
  }, [stack, customPackages])

  // Keep the selection dependency-consistent as the user toggles (resolves any feature `requires`).
  const transformSelection = useCallback(
    (
      nextSelected: Array<MultiSelectItem>,
      toggledItem: MultiSelectItem,
      action: 'select' | 'unselect',
    ): Array<MultiSelectItem> => {
      const selectedValues = nextSelected.map((item) => item.value as FeatureName)
      const resolved = applyFeatureToggle(
        stack,
        selectedValues,
        toggledItem.value as FeatureName,
        action,
      )
      return resolved
        .map((value) => customPackages.find((pkg) => pkg.value === value))
        .filter((pkg): pkg is MultiSelectItem => pkg !== undefined)
    },
    [stack, customPackages],
  )

  // biome-ignore lint/correctness/useExhaustiveDependencies: Run this only once, no matter what
  useEffect(() => {
    if (skip) {
      onCompletion()
    }
  }, [])

  const onHandleSubmit = (selectedItems: Array<MultiSelectItem>) => {
    onSubmit(selectedItems)
    setSubmitted(selectedItems)
    onCompletion()
  }

  if (skip) {
    return null
  }

  if (submitted) {
    return (
      <Text>
        Optional packages:{' '}
        <Text
          bold
          color={'green'}
        >
          {submitted.length > 0 ? submitted.map((item) => item.label).join(', ') : 'none'}
        </Text>
      </Text>
    )
  }

  return (
    <>
      <Text color={'whiteBright'}>Choose optional packages</Text>
      <MultiSelect
        defaultSelected={defaultSelected}
        focus
        items={customPackages}
        onSubmit={onHandleSubmit}
        transformSelection={transformSelection}
      />
    </>
  )
}

export default OptionalPackages
