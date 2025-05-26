import Divider from 'ink-divider'
import React, { type FC } from 'react'
import CloneRepo from './CloneRepo.js'

interface Props {
  projectName: string
  onCompletion: () => void
}

const Step2: FC<Props> = ({ projectName, onCompletion }) => (
  <>
    <Divider
      titlePadding={2}
      titleColor={'whiteBright'}
      title={`Cloning "${projectName}"`}
    />
    <CloneRepo
      projectName={projectName}
      onCompletion={onCompletion}
    />
  </>
)

export default Step2
