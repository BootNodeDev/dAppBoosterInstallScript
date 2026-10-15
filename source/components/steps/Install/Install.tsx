import { type FC, useCallback, useMemo } from 'react'
import { createEnvFile, installPackages } from '../../../operations/index.js'
import { completeInstall } from '../../../operations/installGuard.js'
import type { FeatureName } from '../../../types/types.js'
import { getProjectFolder } from '../../../utils/utils.js'
import StepProgress from '../StepProgress.js'

interface Props {
  features: FeatureName[]
  projectName: string
  onCompletion: () => void
}

const Install: FC<Props> = ({ features, projectName, onCompletion }) => {
  const projectFolder = useMemo(() => getProjectFolder(projectName), [projectName])

  const run = useCallback(
    async (onProgress: (step: string) => void) => {
      onProgress('Creating env files')
      await createEnvFile(projectFolder)
      await installPackages(projectFolder, features, onProgress)
      completeInstall()
    },
    [projectFolder, features],
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
