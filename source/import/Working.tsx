import React, { FC, ReactNode } from 'react'
import { Box, Text } from 'ink'
import Spinner from 'ink-spinner'

export interface Props {
  isWorking: boolean
  children: ReactNode
  show?: boolean
}

const Working: FC<Props> = ({ show = true, isWorking, children }) =>
  show ? (
    <Box>
      {isWorking && <Spinner type="dots" />}
      <Text> {children}</Text>
    </Box>
  ) : null

export default Working
