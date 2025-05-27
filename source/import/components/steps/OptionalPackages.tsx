import { Text } from 'ink'
import MultiSelect from '../Multiselect/index.js'

import React, { useState, type FC, useEffect } from 'react'
import type { Installation } from './InstallationType.js'

export interface Item {
  label: string
  value: string
}

interface Props {
  installation: Installation | undefined
  onCompletion: () => void
  onSubmit: (selectedItems: Array<Item>) => void
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

/**
 * Step for selecting optional packages. Skipped if installation type is 'full'.
 * @param onCompletion
 * @param onSubmit
 * @param installation
 */
const OptionalPackages: FC<Props> = ({ onCompletion, onSubmit, installation }) => {
  const [isFocused, setIsFocused] = useState(true)
  const skip = installation === 'full'

  // biome-ignore lint/correctness/useExhaustiveDependencies: Run this only once
  useEffect(() => {
    // full installation, do nothing
    if (skip) {
      onCompletion()
    }
  }, [])

  const onHandleSubmit = (selectedItems: Array<Item>) => {
    onSubmit(selectedItems)
    setIsFocused(false)
    onCompletion()
  }

  return skip ? null : (
    <>
      <Text color={'whiteBright'}>Choose optional packages</Text>
      <MultiSelect
        focus={isFocused}
        items={customPackages}
        onSubmit={onHandleSubmit}
      />
    </>
  )
}

export default OptionalPackages
