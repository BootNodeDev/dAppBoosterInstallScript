import { type FC, useCallback, useMemo } from 'react'
import { cleanupFiles } from '../../operations/index.js'
import type { FeatureName } from '../../types/types.js'
import { getProjectFolder } from '../../utils/utils.js'
import StepProgress from './StepProgress.js'

interface Props {
  features: FeatureName[]
  onCompletion: () => void
  projectName: string
}

const FileCleanup: FC<Props> = ({ features, onCompletion, projectName }) => {
  const projectFolder = useMemo(() => getProjectFolder(projectName), [projectName])

  const run = useCallback(
    (onProgress: (step: string) => void) => cleanupFiles(projectFolder, features, onProgress),
    [projectFolder, features],
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
