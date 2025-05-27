import React, { type FC } from 'react'
import CloneRepo from './CloneRepo.js'
import Divider from './Divider.js'

interface Props {
  projectName: string
  onCompletion: () => void
}

const Step2: FC<Props> = ({ projectName, onCompletion }) => (
  <>
    <Divider title={`Cloning "${projectName}"`} />
    <CloneRepo
      projectName={projectName}
      onCompletion={onCompletion}
    />
  </>
)

export default Step2
