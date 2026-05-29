import { type FC, useCallback, useMemo } from 'react'
import { isValidName, projectDirectoryExists } from '../../utils/utils.js'
import Ask from '../Ask.js'

interface Props {
  onCompletion: () => void
  onSubmit: (value: string) => void
  projectName: string
}

const ProjectName: FC<Props> = ({ projectName, onSubmit, onCompletion }) => {
  const validateName = useCallback((name: string): string => {
    if (name.length === 0) {
      return ''
    }
    if (!isValidName(name)) {
      return 'Not a valid name!'
    }
    if (projectDirectoryExists(name)) {
      return `A directory named "${name}" already exists. Choose another name.`
    }
    return ''
  }, [])

  const errorMessage = useMemo(() => validateName(projectName), [projectName, validateName])

  const handleSubmit = useCallback(
    (name: string) => {
      onSubmit(name)

      if (name.length > 0 && validateName(name) === '') {
        onCompletion()
      }
    },
    [onSubmit, onCompletion, validateName],
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
