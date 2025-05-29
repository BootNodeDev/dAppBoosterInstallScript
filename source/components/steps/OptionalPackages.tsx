import { Text } from 'ink'
import { type FC, useState } from 'react'
import type { MultiSelectItem } from '../../types/types.js'
import MultiSelect from '../Multiselect/index.js'

const customPackages: Array<MultiSelectItem> = [
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

interface Props {
  onCompletion: () => void
  onSubmit: (selectedItems: Array<MultiSelectItem>) => void
  skip?: boolean
}

/**
 * Step for selecting optional packages. Skipped if installation type is 'full'.
 * @param onCompletion
 * @param onSubmit
 * @param installation
 * @param skip
 */
const OptionalPackages: FC<Props> = ({ onCompletion, onSubmit, skip = false }) => {
  const [isFocused, setIsFocused] = useState(true)

  // full installation, do nothing
  if (skip) {
    onCompletion()
  }

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
