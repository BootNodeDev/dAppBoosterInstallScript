import { join } from 'node:path'
import * as process from 'node:process'
import { Box, Text } from 'ink'
import { Script, Spawn } from 'ink-spawn'
import React, { useState, type FC } from 'react'
import { repoUrl } from './config.js'
import { canShowStep } from './utils.js'

interface Props {
  projectName: string
  onCompletion: () => void
}

/**
 * @description Clone the repository
 */
const CloneRepo: FC<Props> = ({ projectName, onCompletion }) => {
  const projectDir = join(process.cwd(), projectName)
  const [currentStep, setCurrentStep] = useState(1)

  const finishStep = () => setCurrentStep(currentStep + 1)

  return (
    <Box
      flexDirection={'column'}
      gap={0}
    >
      <Script>
        {canShowStep(currentStep, 1) && (
          <Box columnGap={1}>
            <Text color={'whiteBright'}>Cloning dAppBooster in </Text>
            <Text italic>{projectName}</Text>
          </Box>
        )}
        <Spawn
          shell
          silent
          successText={'Done!'}
          failureText={`Failed to clone the project, check if a folder called "${projectName}" already exists and your read/write permissions...`}
          runningText={'Working...'}
          onCompletion={() => {
            finishStep()
          }}
          command="git"
          args={['clone', '--depth', '1', '--no-checkout', repoUrl, projectName]}
        />
        {canShowStep(currentStep, 2) && <Text color={'whiteBright'}>Fetching tags</Text>}
        <Spawn
          shell
          cwd={projectDir}
          silent
          command={'git'}
          args={['fetch', '--tags']}
          runningText={'Working...'}
          successText={'Done!'}
          failureText={'Error...'}
          onCompletion={() => {
            finishStep()
          }}
        />
        {canShowStep(currentStep, 3) && <Text color={'whiteBright'}>Checking out latest tag</Text>}
        <Spawn
          shell
          cwd={projectDir}
          command="git"
          args={['checkout $(git describe --tags `git rev-list --tags --max-count=1`)']}
          successText="Done!"
          failureText={'Error...'}
          onCompletion={() => {
            finishStep()
          }}
        />
        {canShowStep(currentStep, 4) && <Text color={'whiteBright'}>Removing .git folder</Text>}
        <Spawn
          shell
          cwd={projectDir}
          command="rm"
          args={['-rf', '.git']}
          successText="Done!"
          failureText={'Error...'}
          onCompletion={() => {
            finishStep()
          }}
        />
        {canShowStep(currentStep, 5) && (
          <Text color={'whiteBright'}>Initializing Git repository</Text>
        )}
        <Spawn
          shell
          cwd={projectDir}
          command="git"
          args={['init']}
          successText="Done!"
          failureText={'Error...'}
          onCompletion={() => {
            finishStep()
            onCompletion()
          }}
        />
      </Script>
    </Box>
  )
}

export default CloneRepo
