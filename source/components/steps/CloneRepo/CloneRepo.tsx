import { Text } from 'ink'
import { type FC, useCallback, useEffect, useState } from 'react'
import { cloneRepo } from '../../../operations/index.js'
import { deriveStepDisplay } from '../../../utils/utils.js'
import Divider from '../../Divider.js'

interface Props {
  projectName: string
  onCompletion: () => void
}

const CloneRepo: FC<Props> = ({ projectName, onCompletion }) => {
  const [steps, setSteps] = useState<string[]>([])
  const [status, setStatus] = useState<'running' | 'done' | 'error'>('running')
  const [errorMessage, setErrorMessage] = useState('')

  const handleProgress = useCallback((step: string) => {
    setSteps((prev) => [...prev, step])
  }, [])

  useEffect(() => {
    cloneRepo(projectName, handleProgress)
      .then(() => {
        setStatus('done')
        onCompletion()
      })
      .catch((error: unknown) => {
        setStatus('error')
        setErrorMessage(error instanceof Error ? error.message : String(error))
      })
  }, [projectName, onCompletion, handleProgress])

  const { completedSteps, currentStep, failedStep } = deriveStepDisplay(steps, status)

  return (
    <>
      <Divider title={'Git tasks'} />
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
      {status === 'error' && <Text color={'red'}>Failed to clone: {errorMessage}</Text>}
    </>
  )
}

export default CloneRepo
