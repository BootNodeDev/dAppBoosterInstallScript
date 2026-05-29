import { Text } from 'ink'
import { type FC, useEffect, useMemo, useState } from 'react'
import { type Stack, getStackConfig } from '../../constants/config.js'
import type { MultiSelectItem } from '../../types/types.js'
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
        defaultSelected={customPackages}
        focus
        items={customPackages}
        onSubmit={onHandleSubmit}
      />
    </>
  )
}

export default OptionalPackages
