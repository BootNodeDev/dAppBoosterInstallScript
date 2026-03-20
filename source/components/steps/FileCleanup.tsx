import { Text } from 'ink'
import { type FC, useEffect, useMemo, useState } from 'react'
import type { FeatureName } from '../../constants/config.js'
import { cleanupFiles } from '../../operations/index.js'
import type { InstallationType, MultiSelectItem } from '../../types/types.js'
import { getProjectFolder } from '../../utils/utils.js'
import Divider from '../Divider.js'

interface Props {
  onCompletion: () => void
  projectName: string
  installationConfig: {
    installationType: InstallationType | undefined
    selectedFeatures?: Array<MultiSelectItem>
  }
}

const FileCleanup: FC<Props> = ({ onCompletion, installationConfig, projectName }) => {
  const { installationType, selectedFeatures } = installationConfig
  const projectFolder = useMemo(() => getProjectFolder(projectName), [projectName])
  const [status, setStatus] = useState<'running' | 'done' | 'error'>('running')
  const [errorMessage, setErrorMessage] = useState('')

  useEffect(() => {
    const features = selectedFeatures?.map((f) => f.value as FeatureName) ?? []

    cleanupFiles(projectFolder, installationType ?? 'full', features)
      .then(() => {
        setStatus('done')
        onCompletion()
      })
      .catch((error: unknown) => {
        setStatus('error')
        setErrorMessage(error instanceof Error ? error.message : String(error))
      })
  }, [projectFolder, installationType, selectedFeatures, onCompletion])

  return (
    <>
      <Divider title={'File cleanup'} />
      {status === 'running' && <Text color={'whiteBright'}>Cleaning up files... Working...</Text>}
      {status === 'done' && <Text color={'green'}>File cleanup complete. Done!</Text>}
      {status === 'error' && <Text color={'red'}>Cleanup failed: {errorMessage}</Text>}
    </>
  )
}

export default FileCleanup
