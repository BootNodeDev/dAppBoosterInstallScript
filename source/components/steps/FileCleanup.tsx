import { Text } from 'ink'
import { type FC, useCallback, useEffect, useMemo, useState } from 'react'
import type { FeatureName, Stack } from '../../constants/config.js'
import { cleanupFiles } from '../../operations/index.js'
import { abortInstall, completeInstall } from '../../operations/installGuard.js'
import type { InstallationType } from '../../types/types.js'
import { deriveStepDisplay, getProjectFolder } from '../../utils/utils.js'
import Divider from '../Divider.js'

interface Props {
  stack: Stack
  mode: InstallationType
  features: FeatureName[]
  onCompletion: () => void
  projectName: string
}

const FileCleanup: FC<Props> = ({ stack, mode, features, onCompletion, projectName }) => {
  const projectFolder = useMemo(() => getProjectFolder(projectName), [projectName])
  const [steps, setSteps] = useState<string[]>([])
  const [status, setStatus] = useState<'running' | 'done' | 'error'>('running')
  const [errorMessage, setErrorMessage] = useState('')

  const handleProgress = useCallback((step: string) => {
    setSteps((prev) => [...prev, step])
  }, [])

  useEffect(() => {
    cleanupFiles(stack, projectFolder, mode, features, handleProgress)
      .then(() => {
        completeInstall()
        setStatus('done')
        onCompletion()
      })
      .catch((error: unknown) => {
        setStatus('error')
        setErrorMessage(error instanceof Error ? error.message : String(error))
        abortInstall()
      })
  }, [stack, projectFolder, mode, features, onCompletion, handleProgress])

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
