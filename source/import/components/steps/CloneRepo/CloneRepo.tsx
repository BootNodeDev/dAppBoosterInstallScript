import React, { type FC } from 'react'
import Divider from '../../Divider.js'
import Commands from './Commands.js'

interface Props {
  projectName: string
  onCompletion: () => void
}

/**
 * Step for cloning the repository.
 * @param projectName
 * @param onCompletion
 * @constructor
 */
const CloneRepo: FC<Props> = ({ projectName, onCompletion }) => (
  <>
    <Divider title={`Cloning "${projectName}"`} />
    <Commands
      projectName={projectName}
      onCompletion={onCompletion}
    />
  </>
)

export default CloneRepo
