import { Box, Text } from 'ink'
import { Script, Spawn } from 'ink-spawn'
import { type FC, useMemo } from 'react'
import type { InstallationType, MultiSelectItem } from '../../../types/types.js'
import { getProjectFolder } from '../../../utils/utils.js'
import Divider from '../../Divider.js'
import CustomInstallation from './CustomInstallation.js'
import FullInstallation from './FullInstallation.js'

interface Props {
  installationConfig: {
    installationType: InstallationType | undefined
    selectedFeatures?: Array<MultiSelectItem>
  }
  projectName: string
  onCompletion: () => void
}

const Install: FC<Props> = ({ projectName, onCompletion, installationConfig }) => {
  const { installationType, selectedFeatures } = installationConfig
  const projectFolder = useMemo(() => getProjectFolder(projectName), [projectName])
  const title = installationType
    ? installationType[0]?.toUpperCase() + installationType.slice(1)
    : ''

  return (
    <>
      <Divider title={`${title ?? 'Full'} installation`} />
      <Box
        flexDirection={'column'}
        gap={0}
      >
        <Script>
          <Box columnGap={1}>
            <Text color={'whiteBright'}>
              Creating{' '}
              <Text
                italic
                color={'white'}
              >
                .env.local
              </Text>{' '}
              file
            </Text>
          </Box>
          <Spawn
            shell
            cwd={projectFolder}
            silent
            command={'cp'}
            args={['.env.example', '.env.local']}
            runningText={'Working...'}
            successText={'Done!'}
            failureText={'Error...'}
          />
          {installationType === 'full' && (
            <FullInstallation
              onCompletion={onCompletion}
              projectFolder={projectFolder}
            />
          )}
          {installationType === 'custom' && (
            <CustomInstallation
              selectedFeatures={selectedFeatures}
              onCompletion={onCompletion}
              projectFolder={projectFolder}
            />
          )}
        </Script>
      </Box>
    </>
  )
}

export default Install
