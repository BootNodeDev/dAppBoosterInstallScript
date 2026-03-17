import { Text } from 'ink'
import { type FC, useEffect, useState } from 'react'
import { cloneRepo } from '../../../operations/index.js'
import Divider from '../../Divider.js'

interface Props {
  projectName: string
  onCompletion: () => void
}

const CloneRepo: FC<Props> = ({ projectName, onCompletion }) => {
  const [status, setStatus] = useState<'running' | 'done' | 'error'>('running')
  const [errorMessage, setErrorMessage] = useState('')

  useEffect(() => {
    cloneRepo(projectName)
      .then(() => {
        setStatus('done')
        onCompletion()
      })
      .catch((error: Error) => {
        setStatus('error')
        setErrorMessage(error.message)
      })
  }, [projectName, onCompletion])

  return (
    <>
      <Divider title={'Git tasks'} />
      {status === 'running' && (
        <Text color={'whiteBright'}>
          Cloning dAppBooster in <Text italic>{projectName}</Text>... Working...
        </Text>
      )}
      {status === 'done' && (
        <Text color={'green'}>
          Cloned dAppBooster in <Text italic>{projectName}</Text>. Done!
        </Text>
      )}
      {status === 'error' && <Text color={'red'}>Failed to clone: {errorMessage}</Text>}
    </>
  )
}

export default CloneRepo
