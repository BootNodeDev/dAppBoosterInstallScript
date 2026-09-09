import { Text } from 'ink'
import { type FC, useCallback, useEffect, useMemo, useState } from 'react'
import type { FeatureName, Stack } from '../../../constants/config.js'
import { createEnvFile } from '../../../operations/createEnvFile.js'
import { abortInstall } from '../../../operations/installGuard.js'
import { installPackages } from '../../../operations/installPackages.js'
import type { InstallationType } from '../../../types/types.js'
import { deriveStepDisplay, getProjectFolder } from '../../../utils/utils.js'
import Divider from '../../Divider.js'

interface Props {
  stack: Stack
  mode: InstallationType
  features: FeatureName[]
  projectName: string
  onCompletion: () => void
}

const Install: FC<Props> = ({ stack, mode, features, projectName, onCompletion }) => {
  const projectFolder = useMemo(() => getProjectFolder(projectName), [projectName])
  const [steps, setSteps] = useState<string[]>([])
  const [status, setStatus] = useState<'running' | 'done' | 'error'>('running')
  const [errorMessage, setErrorMessage] = useState('')

  const title = mode[0]?.toUpperCase() + mode.slice(1)

  const handleProgress = useCallback((step: string) => {
    setSteps((prev) => [...prev, step])
  }, [])

  useEffect(() => {
    const run = async () => {
      handleProgress('Creating env files')
      await createEnvFile(stack, projectFolder, features)
      await installPackages(stack, projectFolder, mode, features, handleProgress)
    }

    run()
      .then(() => {
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
