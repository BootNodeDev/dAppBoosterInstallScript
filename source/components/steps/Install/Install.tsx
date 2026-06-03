import { Text } from 'ink'
import { type FC, useCallback, useEffect, useMemo, useState } from 'react'
import type { FeatureName, Stack } from '../../../constants/config.js'
import { createEnvFile } from '../../../operations/createEnvFile.js'
import { installPackages } from '../../../operations/installPackages.js'
import type { InstallationType, MultiSelectItem } from '../../../types/types.js'
import { deriveStepDisplay, getProjectFolder, resolveModeFeatures } from '../../../utils/utils.js'
import Divider from '../../Divider.js'

interface Props {
  stack: Stack
  installationConfig: {
    installationType: InstallationType | undefined
    selectedFeatures?: Array<MultiSelectItem>
  }
  projectName: string
  onCompletion: () => void
}

const Install: FC<Props> = ({ stack, projectName, onCompletion, installationConfig }) => {
  const { installationType, selectedFeatures } = installationConfig
  const projectFolder = useMemo(() => getProjectFolder(projectName), [projectName])
  const [steps, setSteps] = useState<string[]>([])
  const [status, setStatus] = useState<'running' | 'done' | 'error'>('running')
  const [errorMessage, setErrorMessage] = useState('')

  const title = installationType
    ? installationType[0]?.toUpperCase() + installationType.slice(1)
    : 'Full'

  const handleProgress = useCallback((step: string) => {
    setSteps((prev) => [...prev, step])
  }, [])

  useEffect(() => {
    const selectedNames = selectedFeatures?.map((f) => f.value as FeatureName) ?? []
    const features = resolveModeFeatures(stack, installationType ?? 'full', selectedNames)

    const run = async () => {
      handleProgress('Creating env files')
      await createEnvFile(stack, projectFolder, features)
      await installPackages(
        stack,
        projectFolder,
        installationType ?? 'full',
        features,
        handleProgress,
      )
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
  }, [stack, projectFolder, installationType, selectedFeatures, onCompletion, handleProgress])

  const { completedSteps, currentStep, failedStep } = deriveStepDisplay(steps, status)

  return (
    <>
      <Divider title={`${title} installation`} />
      {completedSteps.map((step) => (
        <Text key={step}>
          <Text color={'green'}>{'✔'}</Text> {step}
        </Text>
      ))}
      {currentStep && (
        <Text>
          <Text dimColor>{'○'}</Text> {currentStep} <Text dimColor>Working...</Text>
        </Text>
      )}
      {failedStep && (
        <Text>
          <Text color={'red'}>{'✗'}</Text> {failedStep} <Text color={'red'}>Error</Text>
        </Text>
      )}
      {status === 'error' && <Text color={'red'}>Installation failed: {errorMessage}</Text>}
    </>
  )
}

export default Install
