import { Box, Text } from 'ink'
import Divider from 'ink-divider'
import SelectInput from 'ink-select-input'
import React, { type FC } from 'react'

export interface ItemProps {
  label: string
  value: string
}

interface Props {
  onCompletion: () => void
  onSelect: (item: ItemProps) => void
}

const Step3: FC<Props> = ({ onCompletion, onSelect }) => {
  const handleSelect = (item: ItemProps) => {
    onSelect(item)
    onCompletion()
  }

  const items = [
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
        items={items}
        onSelect={handleSelect}
      />
    </>
  )
}

export default Step3
