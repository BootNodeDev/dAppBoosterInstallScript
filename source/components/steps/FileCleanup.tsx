import { type FC, useCallback, useMemo } from 'react'
import type { FeatureName, Stack } from '../../constants/config.js'
import { cleanupFiles } from '../../operations/index.js'
import type { InstallationType } from '../../types/types.js'
import { getProjectFolder } from '../../utils/utils.js'
import StepProgress from './StepProgress.js'

interface Props {
  stack: Stack
  mode: InstallationType
  features: FeatureName[]
  onCompletion: () => void
  projectName: string
}

const FileCleanup: FC<Props> = ({ stack, mode, features, onCompletion, projectName }) => {
  const projectFolder = useMemo(() => getProjectFolder(projectName), [projectName])

  const run = useCallback(
    (onProgress: (step: string) => void) =>
      cleanupFiles(stack, projectFolder, mode, features, onProgress),
    [stack, projectFolder, mode, features],
  )

  return (
    <StepProgress
      title={'File cleanup'}
      errorLabel={'Cleanup failed'}
      run={run}
      onCompletion={onCompletion}
    />
  )
}

export default FileCleanup
