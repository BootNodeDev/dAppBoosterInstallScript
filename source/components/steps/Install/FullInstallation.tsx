import { Box } from 'ink'
import { Script } from 'ink-spawn'
import React, { type FC } from 'react'
import InstallAllPackages from './InstallAllPackages.js'

interface Props {
  projectFolder: string
  onCompletion?: () => void
}

const FullInstallation: FC<Props> = ({ onCompletion, projectFolder }) => {
  return (
    <Box
      flexDirection={'column'}
      gap={0}
    >
      <Script>
        <InstallAllPackages
          projectFolder={projectFolder}
          onCompletion={onCompletion}
        />
      </Script>
    </Box>
  )
}

export default FullInstallation
