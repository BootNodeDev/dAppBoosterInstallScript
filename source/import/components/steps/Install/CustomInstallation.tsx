import { Text } from 'ink'
import React, { type FC } from 'react'
import type { Item as CustomOptionsItem } from '../OptionalPackages.js'

interface Props {
  installationPackages?: Array<CustomOptionsItem>
  onCompletion: () => void
  projectName: string
}

const CustomInstallation: FC<Props> = ({ projectName, onCompletion, installationPackages }) => (
  <Text>Custom Installation!</Text>
)

export default CustomInstallation
