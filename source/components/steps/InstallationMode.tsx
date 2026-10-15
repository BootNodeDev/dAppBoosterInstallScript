import figures from 'figures'
import { Text } from 'ink'
import SelectInput from 'ink-select-input'
import { type FC, useState } from 'react'
import type { InstallationSelectItem } from '../../types/types.js'
import { MODE_LABELS } from '../../utils/utils.js'
import Divider from '../Divider.js'

interface Props {
  onCompletion: () => void
  onSelect: (item: InstallationSelectItem) => void
}

const installationTypeItems: Array<InstallationSelectItem> = (['full', 'custom'] as const).map(
  (value) => ({ label: MODE_LABELS[value], value }),
)

const InstallationMode: FC<Props> = ({ onCompletion, onSelect }) => {
  const [selected, setSelected] = useState<InstallationSelectItem>()

  const handleSelect = (item: InstallationSelectItem) => {
    onSelect(item)
    setSelected(item)
    onCompletion()
  }

  return (
    <>
      <Divider title={'Installation setup'} />
      {selected ? (
        <Text>
          Installation type:{' '}
          <Text
            bold
            color={'green'}
          >
            {selected.label}
          </Text>
        </Text>
      ) : (
        <>
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
            items={installationTypeItems}
            onSelect={handleSelect}
          />
        </>
      )}
    </>
  )
}

export default InstallationMode
