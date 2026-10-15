import { Text } from 'ink'
import { type FC, useEffect, useMemo, useState } from 'react'
import { getDefaultFeatureNames, getFeatureEntries } from '../../stacks/index.js'
import type { MultiSelectItem, Stack } from '../../types/types.js'
import MultiSelect from '../Multiselect/index.js'

interface Props {
  stack: Stack
  onCompletion: () => void
  onSubmit: (selectedItems: Array<MultiSelectItem>) => void
  skip?: boolean
}

const OptionalPackages: FC<Props> = ({ stack, onCompletion, onSubmit, skip = false }) => {
  const [submitted, setSubmitted] = useState<Array<MultiSelectItem>>()

  const customPackages: Array<MultiSelectItem> = useMemo(
    () =>
      getFeatureEntries(stack).map(([name, definition]) => ({
        label: definition.label,
        value: name,
      })),
    [stack],
  )

  const defaultSelected: Array<MultiSelectItem> = useMemo(() => {
    const defaults = getDefaultFeatureNames(stack)
    return customPackages.filter((pkg) => defaults.includes(pkg.value))
  }, [stack, customPackages])

  // biome-ignore lint/correctness/useExhaustiveDependencies: Run this only once, no matter what
  useEffect(() => {
    if (skip) {
      onCompletion()
    }
  }, [])

  const onHandleSubmit = (selectedItems: Array<MultiSelectItem>) => {
    const inConfigOrder = customPackages.filter((pkg) =>
      selectedItems.some((item) => item.value === pkg.value),
    )
    onSubmit(inConfigOrder)
    setSubmitted(inConfigOrder)
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
      />
    </>
  )
}

export default OptionalPackages
