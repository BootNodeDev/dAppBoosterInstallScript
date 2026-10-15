import { type FC, useCallback, useMemo } from 'react'
import { createEnvFile, installPackages } from '../../../operations/index.js'
import { completeInstall } from '../../../operations/installGuard.js'
import type { FeatureName, InstallationType } from '../../../types/types.js'
import { getProjectFolder } from '../../../utils/utils.js'
import StepProgress from '../StepProgress.js'

interface Props {
  mode: InstallationType
  features: FeatureName[]
  projectName: string
  onCompletion: () => void
}

const Install: FC<Props> = ({ mode, features, projectName, onCompletion }) => {
  const projectFolder = useMemo(() => getProjectFolder(projectName), [projectName])

  const run = useCallback(
    async (onProgress: (step: string) => void) => {
      onProgress('Creating env files')
      await createEnvFile(projectFolder)
      await installPackages(projectFolder, mode, features, onProgress)
      completeInstall()
    },
    [projectFolder, mode, features],
  )

  return (
    <StepProgress
      title={'Installation'}
      errorLabel={'Installation failed'}
      run={run}
      onCompletion={onCompletion}
    />
  )
}

export default Install
