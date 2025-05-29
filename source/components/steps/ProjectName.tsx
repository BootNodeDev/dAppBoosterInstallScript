import { type FC, useCallback, useMemo } from 'react'
import { isValidName } from '../../utils/utils.js'
import Ask from '../Ask.js'

interface Props {
  onCompletion: () => void
  onSubmit: (value: string) => void
  projectName: string
}

/**
 * Component to ask for the project name.
 * @param projectName
 * @param onSubmit
 * @param onCompletion
 */
const ProjectName: FC<Props> = ({ projectName, onSubmit, onCompletion }) => {
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
      question={'Project name'}
      tip={'Letters (a–z, A–Z), numbers (0–9), and underscores (_) are allowed.'}
    />
  )
}

export default ProjectName
