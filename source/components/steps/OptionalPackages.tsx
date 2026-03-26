import { Text } from 'ink'
import { type FC, useEffect, useState } from 'react'
import { featureDefinitions, featureNames } from '../../constants/config.js'
import type { MultiSelectItem } from '../../types/types.js'
import MultiSelect from '../Multiselect/index.js'

const customPackages: Array<MultiSelectItem> = featureNames.map((name) => ({
  label: featureDefinitions[name].label,
  value: name,
}))

interface Props {
  onCompletion: () => void
  onSubmit: (selectedItems: Array<MultiSelectItem>) => void
  skip?: boolean
}

const OptionalPackages: FC<Props> = ({ onCompletion, onSubmit, skip = false }) => {
  const [isFocused, setIsFocused] = useState(true)

  // biome-ignore lint/correctness/useExhaustiveDependencies: Run this only once, no matter what
  useEffect(() => {
    if (skip) {
      onCompletion()
    }
  }, [])

  const onHandleSubmit = (selectedItems: Array<MultiSelectItem>) => {
    onSubmit(selectedItems)
    setIsFocused(false)
    onCompletion()
  }

  return skip ? null : (
    <>
      <Text color={'whiteBright'}>Choose optional packages</Text>
      <MultiSelect
        defaultSelected={customPackages}
        focus={isFocused}
        items={customPackages}
        onSubmit={onHandleSubmit}
      />
    </>
  )
}

export default OptionalPackages
