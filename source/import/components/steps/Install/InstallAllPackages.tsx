import { Text } from 'ink'
import { Spawn } from 'ink-spawn'
import React, { type FC } from 'react'

interface Props {
  onCompletion?: () => void
  projectDir: string
}

const InstallAllPackages: FC<Props> = ({ projectDir, onCompletion }) => {
  return (
    <>
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
    </>
  )
}

export default InstallAllPackages
