import { join } from 'node:path'
import process from 'node:process'
import { Box, Text } from 'ink'
import { Script, Spawn } from 'ink-spawn'
import React, { type FC } from 'react'

interface Props {
  projectName: string
  onCompletion: () => void
}

const FullInstallation: FC<Props> = ({ projectName, onCompletion }) => {
  const projectDir = join(process.cwd(), projectName)

  return (
    <Box
      flexDirection={'column'}
      gap={0}
    >
      <Script>
        <Text color={'whiteBright'}>Installing packages</Text>
        <Spawn
          shell
          cwd={projectDir}
          silent
          command={'pnpm'}
          args={['i']}
          runningText={'Working...'}
          successText={'Done!'}
          failureText={'Error...'}
          onCompletion={onCompletion}
        />
      </Script>
    </Box>
  )
}

export default FullInstallation
