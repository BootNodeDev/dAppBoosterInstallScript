import { Text } from 'ink'
import Divider from 'ink-divider'
import SelectInput from 'ink-select-input'
import React, { useState, type FC } from 'react'

type Installation = 'full' | 'custom'

export interface Item {
  label: string
  value: Installation
}

interface Props {
  onCompletion: () => void
  onSelect: (item: Item) => void
}

const Step3: FC<Props> = ({ onCompletion, onSelect }) => {
  const [isFocused, setIsFocused] = useState(true)

  const handleSelect = (item: Item) => {
    onSelect(item)
    onCompletion()
    setIsFocused(false)
  }

  const items: Array<Item> = [
    {
      label: 'Full',
      value: 'full',
    },
    {
      label: 'Custom',
      value: 'custom',
    },
  ]

  return (
    <>
      <Divider
        titlePadding={2}
        titleColor={'whiteBright'}
        title={'Installation setup'}
      />
      <Text color={'whiteBright'}>Choose installation type</Text>
      <SelectInput
        indicatorComponent={({ isSelected }) => (
          <Text color="green">{isSelected ? '> ' : '  '}</Text>
        )}
        itemComponent={({ label, isSelected }) => (
          <Text
            color={isSelected ? 'green' : 'white'}
            bold={isSelected}
          >
            {label}
          </Text>
        )}
        isFocused={isFocused}
        items={items}
        onSelect={handleSelect}
      />
    </>
  )
}

export default Step3
