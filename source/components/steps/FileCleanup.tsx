import { Text } from 'ink'
import { type FC, useCallback, useEffect, useMemo, useState } from 'react'
import type { FeatureName } from '../../constants/config.js'
import { cleanupFiles } from '../../operations/index.js'
import type { InstallationType, MultiSelectItem } from '../../types/types.js'
import { deriveStepDisplay, getProjectFolder } from '../../utils/utils.js'
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
  const [steps, setSteps] = useState<string[]>([])
  const [status, setStatus] = useState<'running' | 'done' | 'error'>('running')
  const [errorMessage, setErrorMessage] = useState('')

  const handleProgress = useCallback((step: string) => {
    setSteps((prev) => [...prev, step])
  }, [])

  useEffect(() => {
    const features = selectedFeatures?.map((f) => f.value as FeatureName) ?? []

    cleanupFiles(projectFolder, installationType ?? 'full', features, handleProgress)
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
      <Divider title={'File cleanup'} />
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
      {status === 'error' && <Text color={'red'}>Cleanup failed: {errorMessage}</Text>}
    </>
  )
}

export default FileCleanup
