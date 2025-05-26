import Gradient from 'ink-gradient'
import BigText from 'ink-big-text'
import Ask from './Ask.js'
import React, { FC } from 'react'

interface Props {
  projectName: string
  errorMessage: string | undefined
  onSubmit: (value: string) => void
}

const ProjectName: FC<Props> = ({ projectName, errorMessage, onSubmit }) => (
  <>
    <Gradient colors={['#ff438c', '#bb1d79', '#8b46a4', '#6a2581']}>
      <BigText lineHeight={1} font={'chrome'} text="dAppBooster" />
    </Gradient>
    <Ask
      answer={projectName}
      errorMessage={errorMessage}
      onSubmit={onSubmit}
      question={'Project name?'}
      tip={'Letters (a–z, A–Z), numbers (0–9), hyphens (-), and underscores (_) are allowed.'}
    />
  </>
)

export default ProjectName
