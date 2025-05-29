import { Text } from 'ink'
import { Spawn } from 'ink-spawn'
import type { FC } from 'react'

interface Props {
  onCompletion?: () => void
  projectFolder: string
}

const InstallAllPackages: FC<Props> = ({ projectFolder, onCompletion }) => {
  return (
    <>
      <Text color={'whiteBright'}>Installing packages</Text>
      <Spawn
        shell
        cwd={projectFolder}
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
