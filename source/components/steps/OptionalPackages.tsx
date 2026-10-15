import { Text } from 'ink'
import { type FC, useEffect, useState } from 'react'
import { defaultFeatureNames, featureEntries } from '../../config.js'
import type { MultiSelectItem } from '../../types/types.js'
import MultiSelect from '../Multiselect/index.js'

const customPackages: Array<MultiSelectItem> = featureEntries.map(([name, definition]) => ({
  label: definition.label,
  value: name,
}))

const defaultSelected = customPackages.filter((pkg) => defaultFeatureNames.includes(pkg.value))

interface Props {
  onCompletion: () => void
  onSubmit: (selectedItems: Array<MultiSelectItem>) => void
  skip?: boolean
}

const OptionalPackages: FC<Props> = ({ onCompletion, onSubmit, skip = false }) => {
  const [submitted, setSubmitted] = useState<Array<MultiSelectItem>>()

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
      />
    </>
  )
}

export default OptionalPackages
