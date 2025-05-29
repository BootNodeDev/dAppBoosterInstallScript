import { join } from 'node:path'
import * as process from 'node:process'
import { Box, Text } from 'ink'
import { Script, Spawn } from 'ink-spawn'
import type { FC } from 'react'
import { repoUrl } from '../../../constants/config.js'

interface Props {
  projectName: string
  onCompletion: () => void
}

/**
 * Executes all the commands to clone the dAppBooster repository.
 * @param projectName
 * @param onCompletion
 */
const Commands: FC<Props> = ({ projectName, onCompletion }) => {
  const projectFolder = join(process.cwd(), projectName)

  return (
    <Box
      flexDirection={'column'}
      gap={0}
    >
      <Script>
        <Box columnGap={1}>
          <Text color={'whiteBright'}>Cloning dAppBooster in</Text>
          <Text italic>{projectName}</Text>
        </Box>
        <Spawn
          shell
          silent
          successText={'Done!'}
          failureText={`Failed to clone the project, check if a folder called "${projectName}" already exists and your read/write permissions...`}
          runningText={'Working...'}
          command="git"
          args={['clone', '--depth', '1', '--no-checkout', repoUrl, projectName]}
        />
        <Text color={'whiteBright'}>Fetching tags</Text>
        <Spawn
          shell
          cwd={projectFolder}
          silent
          command={'git'}
          args={['fetch', '--tags']}
          runningText={'Working...'}
          successText={'Done!'}
          failureText={'Error...'}
        />
        <Text color={'whiteBright'}>Checking out latest tag</Text>
        <Spawn
          shell
          cwd={projectFolder}
          command="git"
          args={['checkout $(git describe --tags `git rev-list --tags --max-count=1`)']}
          successText="Done!"
          failureText={'Error...'}
        />
        <Text color={'whiteBright'}>Removing .git folder</Text>
        <Spawn
          shell
          cwd={projectFolder}
          command="rm"
          args={['-rf', '.git']}
          successText="Done!"
          failureText={'Error...'}
        />
        <Text color={'whiteBright'}>Initializing Git repository</Text>
        <Spawn
          shell
          cwd={projectFolder}
          command="git"
          args={['init']}
          successText="Done!"
          failureText={'Error...'}
          onCompletion={onCompletion}
        />
      </Script>
    </Box>
  )
}

export default Commands
