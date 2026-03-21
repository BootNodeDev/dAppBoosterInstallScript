import { Text } from 'ink'
import { type FC, useCallback, useEffect, useMemo, useState } from 'react'
import type { FeatureName } from '../../../constants/config.js'
import { createEnvFile } from '../../../operations/createEnvFile.js'
import { installPackages } from '../../../operations/installPackages.js'
import type { InstallationType, MultiSelectItem } from '../../../types/types.js'
import { deriveStepDisplay, getProjectFolder } from '../../../utils/utils.js'
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
  const [steps, setSteps] = useState<string[]>([])
  const [status, setStatus] = useState<'running' | 'done' | 'error'>('running')
  const [errorMessage, setErrorMessage] = useState('')

  const title = installationType
    ? installationType[0]?.toUpperCase() + installationType.slice(1)
    : ''

  const handleProgress = useCallback((step: string) => {
    setSteps((prev) => [...prev, step])
  }, [])

  useEffect(() => {
    const features = selectedFeatures?.map((f) => f.value as FeatureName) ?? []

    const run = async () => {
      handleProgress('Creating .env.local file')
      await createEnvFile(projectFolder)
      await installPackages(projectFolder, installationType ?? 'full', features, handleProgress)
    }

    run()
      .then(() => {
        setStatus('done')
        onCompletion()
      })
      .catch((error: unknown) => {
        setStatus('error')
        setErrorMessage(error instanceof Error ? error.message : String(error))
      })
  }, [projectFolder, installationType, selectedFeatures, onCompletion, handleProgress])

  const { completedSteps, currentStep, failedStep } = deriveStepDisplay(steps, status)

  return (
    <>
      <Divider title={`${title ?? 'Full'} installation`} />
      {completedSteps.map((step) => (
        <Text key={step}>
          <Text color={'green'}>{'\u2714'}</Text> {step}
        </Text>
      ))}
      {currentStep && (
        <Text>
          <Text dimColor>{'\u25CB'}</Text> {currentStep} <Text dimColor>Working...</Text>
        </Text>
      )}
      {failedStep && (
        <Text>
          <Text color={'red'}>{'\u2717'}</Text> {failedStep} <Text color={'red'}>Error</Text>
        </Text>
      )}
      {status === 'error' && <Text color={'red'}>Installation failed: {errorMessage}</Text>}
    </>
  )
}

export default Install
