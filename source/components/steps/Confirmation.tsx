import figures from 'figures'
import { Text } from 'ink'
import SelectInput from 'ink-select-input'
import { type FC, useState } from 'react'
import Divider from '../Divider.js'

interface Props {
  summary: string
  onConfirm: () => void
  onCancel: () => void
}

type ConfirmItem = { label: string; value: 'yes' | 'no' }

const confirmItems: Array<ConfirmItem> = [
  { label: 'Yes, scaffold it', value: 'yes' },
  { label: 'No, start over', value: 'no' },
]

// Last side-effect-free step: nothing has touched the disk yet. Confirming starts the operations;
// cancelling loops back to re-answer the questions.
const Confirmation: FC<Props> = ({ summary, onConfirm, onCancel }) => {
  const [confirmed, setConfirmed] = useState(false)

  const handleSelect = (item: ConfirmItem) => {
    if (item.value === 'yes') {
      setConfirmed(true)
      onConfirm()
    } else {
      onCancel()
    }
  }

  return (
    <>
      <Divider title={'Review'} />
      <Text>{summary}</Text>
      {confirmed ? (
        <Text>
          <Text color={'green'}>{figures.tick}</Text> Scaffolding…
        </Text>
      ) : (
        <>
          <Text color={'whiteBright'}>Proceed with these settings?</Text>
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
            items={confirmItems}
            onSelect={handleSelect}
          />
        </>
      )}
    </>
  )
}

export default Confirmation
