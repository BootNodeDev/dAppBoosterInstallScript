import { Box } from 'ink'
import { Script } from 'ink-spawn'
import React, { type FC } from 'react'
import InstallAllPackages from './InstallAllPackages.js'

interface Props {
  projectDir: string
  onCompletion?: () => void
}

const FullInstallation: FC<Props> = ({ onCompletion, projectDir }) => {
  return (
    <Box
      flexDirection={'column'}
      gap={0}
    >
      <Script>
        <InstallAllPackages
          projectDir={projectDir}
          onCompletion={onCompletion}
        />
      </Script>
    </Box>
  )
}

export default FullInstallation
