import { Text } from 'ink'
import { type FC, useEffect, useMemo, useState } from 'react'
import type { FeatureName } from '../../../constants/config.js'
import { createEnvFile } from '../../../operations/createEnvFile.js'
import { installPackages } from '../../../operations/installPackages.js'
import type { InstallationType, MultiSelectItem } from '../../../types/types.js'
import { getProjectFolder } from '../../../utils/utils.js'
import Divider from '../../Divider.js'

interface Props {
  installationConfig: {
    installationType: InstallationType | undefined
    selectedFeatures?: Array<MultiSelectItem>
  }
  projectName: string
  onCompletion: () => void
}

const Install: FC<Props> = ({ projectName, onCompletion, installationConfig }) => {
  const { installationType, selectedFeatures } = installationConfig
  const projectFolder = useMemo(() => getProjectFolder(projectName), [projectName])
  const [status, setStatus] = useState<'running' | 'done' | 'error'>('running')
  const [errorMessage, setErrorMessage] = useState('')

  const title = installationType
    ? installationType[0]?.toUpperCase() + installationType.slice(1)
    : ''

  useEffect(() => {
    const features = selectedFeatures?.map((f) => f.value as FeatureName) ?? []

    const run = async () => {
      await createEnvFile(projectFolder)
      await installPackages(projectFolder, installationType ?? 'full', features)
    }

    run()
      .then(() => {
        setStatus('done')
        onCompletion()
      })
      .catch((error: Error) => {
        setStatus('error')
        setErrorMessage(error.message)
      })
  }, [projectFolder, installationType, selectedFeatures, onCompletion])

  return (
    <>
      <Divider title={`${title ?? 'Full'} installation`} />
      {status === 'running' && <Text color={'whiteBright'}>Installing packages... Working...</Text>}
      {status === 'done' && <Text color={'green'}>Installation complete. Done!</Text>}
      {status === 'error' && <Text color={'red'}>Installation failed: {errorMessage}</Text>}
    </>
  )
}

export default Install
