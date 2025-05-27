import { Text } from 'ink'
import MultiSelect from './Multiselect/index.js'

import React, { useState, type FC, useEffect } from 'react'
import type { Installation } from './Step3.js'

interface Item {
  label: string
  value: string
}

interface Props {
  onCompletion: () => void
  onSubmit: (item: Item) => void
  installation: Installation | undefined
}

const customPackages: Array<Item> = [
  {
    label: 'Component Demos',
    value: 'demo',
  },
  {
    label: 'Subgraph support',
    value: 'subgraph',
  },
  {
    label: 'Typedoc documentation support',
    value: 'typedoc',
  },
  {
    label: 'Vocs documentation support',
    value: 'vocs',
  },
  {
    label: 'Husky Git hooks support',
    value: 'husky',
  },
]

const Step4: FC<Props> = ({ onCompletion, onSubmit, installation }) => {
  const [isFocused, setIsFocused] = useState(true)
  const [showCustomOptions, setShowCustomOptions] = useState(false)
  const skip = installation === 'full'

  // biome-ignore lint/correctness/useExhaustiveDependencies: Run this only once
  useEffect(() => {
    if (skip) {
      onCompletion()
    }
  }, [])

  const onHandleSubmit = (item: Array<Item>) => {
    // onSubmit(item)
    //
    // if (item.value === 'full') {
    //   onCompletion()
    // } else {
    //   setShowCustomOptions(true)
    // }
    // setIsFocused(false)
  }

  return skip ? null : (
    <>
      <Text color={'whiteBright'}>Choose optional packages</Text>
      <MultiSelect
        // indicatorComponent={({ isSelected }) => (
        //   <Text color="green">{isSelected ? '> ' : '  '}</Text>
        // )}
        // itemComponent={({ label, isSelected }) => (
        //   <Text
        //     color={isSelected ? 'green' : 'white'}
        //     bold={isSelected}
        //   >
        //     {label}
        //   </Text>
        // )}
        // isFocused={isFocused}
        items={customPackages}
        onSubmit={onHandleSubmit}
      />
    </>
  )
}

export default Step4
