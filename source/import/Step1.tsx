import React, { type FC, useMemo, useCallback } from 'react'
import Ask from './Ask.js'
import { isValidName } from './utils.js'

interface Props {
  onCompletion: () => void
  onSubmit: (value: string) => void
  projectName: string
}

const Step1: FC<Props> = ({ projectName, onSubmit, onCompletion }) => {
  const validateName = useCallback((name: string): string => {
    if (name.length > 0 && !isValidName(name)) return 'Not a valid name!'

    return ''
  }, [])

  const errorMessage = useMemo(() => validateName(projectName), [projectName, validateName])

  const handleSubmit = useCallback(
    (name: string) => {
      onSubmit(name)

      if (isValidName(name)) {
        onCompletion()
      }
    },
    [onSubmit, onCompletion],
  )

  return (
    <Ask
      answer={projectName}
      errorMessage={errorMessage}
      onSubmit={handleSubmit}
      question={'Project name?'}
      tip={'Letters (a–z, A–Z), numbers (0–9), and underscores (_) are allowed.'}
    />
  )
}

export default Step1
