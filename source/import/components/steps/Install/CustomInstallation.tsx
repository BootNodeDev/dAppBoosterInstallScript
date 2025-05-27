import { Text } from 'ink'
import React, { type FC } from 'react'

interface Props {
  projectName: string
  onCompletion: () => void
}

const CustomInstallation: FC<Props> = ({ projectName, onCompletion }) => (
  <Text>Custom Installation!</Text>
)

export default CustomInstallation
