import BaseDivider from 'ink-divider'
import type { FC } from 'react'

const Divider: FC<{ title: string }> = ({ title }) => (
  <BaseDivider
    titlePadding={2}
    titleColor={'whiteBright'}
    title={title}
  />
)

export default Divider
