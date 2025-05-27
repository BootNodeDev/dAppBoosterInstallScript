import figures from 'figures'
import { Text } from 'ink'
import SelectInput from 'ink-select-input'
import React, { useState, type FC } from 'react'
import type { InstallationSelectItem } from '../../types/types.js'
import Divider from '../Divider.js'

interface Props {
  onCompletion: () => void
  onSelect: (item: InstallationSelectItem) => void
}

const installationTypeItems: Array<InstallationSelectItem> = [
  {
    label: 'Full',
    value: 'full',
  },
  {
    label: 'Custom',
    value: 'custom',
  },
]

const InstallationMode: FC<Props> = ({ onCompletion, onSelect }) => {
  const [isFocused, setIsFocused] = useState(true)

  const handleSelect = (item: InstallationSelectItem) => {
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

export default InstallationMode
