import figures from 'figures'
import { Text } from 'ink'
import SelectInput from 'ink-select-input'
import React, { useState, type FC } from 'react'
import Divider from './Divider.js'

export type Installation = 'full' | 'custom'

export interface Item {
  label: string
  value: Installation
}

interface Props {
  onCompletion: () => void
  onSelect: (item: Item) => void
}

const installationTypeItems: Array<Item> = [
  {
    label: 'Full',
    value: 'full',
  },
  {
    label: 'Custom',
    value: 'custom',
  },
]

const Step3: FC<Props> = ({ onCompletion, onSelect }) => {
  const [isFocused, setIsFocused] = useState(true)

  const handleSelect = (item: Item) => {
    onSelect(item)
    onCompletion()
    setIsFocused(false)
  }

  return (
    <>
      <Divider title={'Installation setup'} />
      <Text color={'whiteBright'}>Choose installation type</Text>
      <SelectInput
        indicatorComponent={({ isSelected }) => (
          <Text color="green">{isSelected ? `${figures.pointer} ` : '  '}</Text>
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
        items={installationTypeItems}
        onSelect={handleSelect}
      />
    </>
  )
}

export default Step3
