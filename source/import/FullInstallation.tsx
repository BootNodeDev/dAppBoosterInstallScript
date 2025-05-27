import { Text } from 'ink'
import React, { type FC } from 'react'

interface Props {
  projectName: string
  onCompletion: () => void
}

const FullInstallation: FC<Props> = ({ projectName, onCompletion }) => (
  <Text>Full Installation!</Text>
)

export default FullInstallation
