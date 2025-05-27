import BigText from 'ink-big-text'
import Gradient from 'ink-gradient'
import React, { type FC } from 'react'

const MainTitle: FC = () => (
  <Gradient colors={['#ff438c', '#bb1d79', '#8b46a4', '#6a2581']}>
    <BigText
      lineHeight={1}
      font={'chrome'}
      text="dAppBooster"
    />
  </Gradient>
)

export default MainTitle
