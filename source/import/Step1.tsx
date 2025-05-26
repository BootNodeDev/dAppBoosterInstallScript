import Divider from 'ink-divider'
import CloneRepo from './CloneRepo.js'
import React, { type FC } from 'react'

interface Props {
  projectName: string
  onSubmit: () => void
}

const Step1: FC<Props> = ({ projectName, onSubmit }) => (
  <>
    <Divider titlePadding={2} titleColor={'whiteBright'} title={`Cloning "${projectName}"`} />
    <CloneRepo projectName={projectName} onCompletion={onSubmit} />
  </>
)

export default Step1
