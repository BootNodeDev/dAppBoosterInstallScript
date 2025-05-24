import React, { FC, ReactNode } from 'react'
import { Box, Text } from 'ink'
import Spinner from 'ink-spinner'

const Working: FC<{ isWorking: boolean; children: ReactNode; show?: boolean }> = ({
  show = true,
  isWorking,
  children,
}) =>
  show ? (
    <Box>
      {isWorking && <Spinner type="dots" />}
      <Text> {children}</Text>
    </Box>
  ) : null

export default Working
