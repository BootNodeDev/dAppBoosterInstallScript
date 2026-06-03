import { Text } from 'ink'
import { type FC, useCallback, useEffect, useMemo, useState } from 'react'
import type { FeatureName, Stack } from '../../constants/config.js'
import { cleanupFiles } from '../../operations/index.js'
import { completeInstall } from '../../operations/installGuard.js'
import type { InstallationType, MultiSelectItem } from '../../types/types.js'
import { deriveStepDisplay, getProjectFolder, resolveModeFeatures } from '../../utils/utils.js'
import Divider from '../Divider.js'

interface Props {
  stack: Stack
  onCompletion: () => void
  projectName: string
  installationConfig: {
    installationType: InstallationType | undefined
    selectedFeatures?: Array<MultiSelectItem>
  }
}

const FileCleanup: FC<Props> = ({ stack, onCompletion, installationConfig, projectName }) => {
  const { installationType, selectedFeatures } = installationConfig
  const projectFolder = useMemo(() => getProjectFolder(projectName), [projectName])
  const [steps, setSteps] = useState<string[]>([])
  const [status, setStatus] = useState<'running' | 'done' | 'error'>('running')
  const [errorMessage, setErrorMessage] = useState('')

  const handleProgress = useCallback((step: string) => {
    setSteps((prev) => [...prev, step])
  }, [])

  useEffect(() => {
    const selectedNames = selectedFeatures?.map((f) => f.value as FeatureName) ?? []
    const features = resolveModeFeatures(stack, installationType ?? 'full', selectedNames)

    cleanupFiles(stack, projectFolder, installationType ?? 'full', features, handleProgress)
      .then(() => {
        // Scaffold is complete — an interrupt from here on must not delete the finished project.
        completeInstall()
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
      <Divider title={'File cleanup'} />
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
      {status === 'error' && <Text color={'red'}>Cleanup failed: {errorMessage}</Text>}
    </>
  )
}

export default FileCleanup
