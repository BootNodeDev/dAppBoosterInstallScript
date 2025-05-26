import Divider from 'ink-divider'
import React, { type FC } from 'react'

interface Props {
  projectName: string
  onCompletion: () => void
}

const Step3: FC<Props> = ({ projectName, onCompletion }) => (
  <>
    <Divider
      titlePadding={2}
      titleColor={'whiteBright'}
      title={'Installation setup'}
    />
  </>
)

export default Step3
