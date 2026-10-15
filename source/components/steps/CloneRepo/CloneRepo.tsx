import { type FC, useCallback } from 'react'
import { cloneRepo } from '../../../operations/index.js'
import { beginInstall } from '../../../operations/installGuard.js'
import { getProjectFolder } from '../../../utils/utils.js'
import StepProgress from '../StepProgress.js'

interface Props {
  projectName: string
  onCompletion: () => void
}

const CloneRepo: FC<Props> = ({ projectName, onCompletion }) => {
  const run = useCallback(
    async (onProgress: (step: string) => void) => {
      beginInstall(getProjectFolder(projectName))
      await cloneRepo(projectName, onProgress)
    },
    [projectName],
  )

  return (
    <StepProgress
      title={'Git tasks'}
      errorLabel={'Failed to clone'}
      run={run}
      onCompletion={onCompletion}
    />
  )
}

export default CloneRepo
