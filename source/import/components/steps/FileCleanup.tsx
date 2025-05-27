import { Box, Text } from 'ink'
import { Script, Spawn } from 'ink-spawn'
import React, { type FC, useMemo } from 'react'
import { homeFolder } from '../../constants/config.js'
import type { InstallationType, MultiSelectItem } from '../../types/types.js'
import { featureSelected, getProjectFolder } from '../../utils/utils.js'

interface Props {
  onCompletion: () => void
  projectName: string
  installationConfig: {
    installationType: InstallationType | undefined
    selectedFeatures?: Array<MultiSelectItem>
  }
}

/**
 * Performs file cleanup after the installation process
 * @param onCompletion
 * @param installation
 * @param projectName
 */
const FileCleanup: FC<Props> = ({ onCompletion, installationConfig, projectName }) => {
  const { installationType, selectedFeatures } = installationConfig
  const projectFolder = useMemo(() => getProjectFolder(projectName), [projectName])
  const currentHomeFolder = `${projectFolder}${homeFolder}`
  const cleanHomeFile = `${projectFolder}/.install-files/home/index.tsx`

  return (
    <Box
      flexDirection={'column'}
      gap={0}
    >
      {!featureSelected('demo', selectedFeatures) && (
        <Script>
          <Text color={'whiteBright'}>Removing component demos</Text>
          <Spawn
            shell
            cwd={projectFolder}
            // silent
            command="rm"
            args={['-rf', currentHomeFolder]}
            // runningText={'Working...'}
            // successText={'Done!'}
            // failureText={'Error...'}
          />
          <Text color={'whiteBright'}>Creating new home folder</Text>
          <Spawn
            shell
            cwd={projectFolder}
            // silent
            command="mkdir"
            args={['-p', currentHomeFolder]}
            // runningText={'Working...'}
            // successText={'Done!'}
            // failureText={'Error...'}
          />
          <Text color={'whiteBright'}>Creating new home page</Text>
          <Spawn
            shell
            cwd={projectFolder}
            // silent
            command="cp"
            args={[cleanHomeFile, currentHomeFolder]}
            // runningText={'Working...'}
            // successText={'Done!'}
            // failureText={'Error...'}
          />
        </Script>
      )}
    </Box>
  )
}

export default FileCleanup
