import { type FC, useCallback, useMemo } from 'react'
import { type FeatureName, getStackConfig, type Stack } from '../../../constants/config.js'
import { createEnvFile, createInitialCommit, installPackages } from '../../../operations/index.js'
import { completeInstall } from '../../../operations/installGuard.js'
import type { InstallationType } from '../../../types/types.js'
import { getProjectFolder } from '../../../utils/utils.js'
import StepProgress from '../StepProgress.js'

interface Props {
  stack: Stack
  mode: InstallationType
  features: FeatureName[]
  projectName: string
  onCompletion: () => void
}

const Install: FC<Props> = ({ stack, mode, features, projectName, onCompletion }) => {
  const projectFolder = useMemo(() => getProjectFolder(projectName), [projectName])
  const title = `${mode[0]?.toUpperCase()}${mode.slice(1)} installation`

  const run = useCallback(
    async (onProgress: (step: string) => void) => {
      onProgress('Creating env files')
      await createEnvFile(stack, projectFolder, features)
      await installPackages(stack, projectFolder, mode, features, onProgress)

      if (getStackConfig(stack).initialCommit) {
        onProgress('Initial commit')
        await createInitialCommit(projectFolder)
      }

      completeInstall()
    },
    [stack, projectFolder, mode, features],
  )

  return (
    <StepProgress
      title={title}
      errorLabel={'Installation failed'}
      run={run}
      onCompletion={onCompletion}
    />
  )
}

export default Install
