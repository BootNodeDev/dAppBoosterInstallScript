import { join } from 'node:path'
import process from 'node:process'
import { Box, Text } from 'ink'
import { Script, Spawn } from 'ink-spawn'
import React, { type FC, useMemo } from 'react'
import type { InstallationType, MultiSelectItem } from '../../../types/types.js'
import Divider from '../../Divider.js'
import CustomInstallation from './CustomInstallation.js'
import FullInstallation from './FullInstallation.js'

interface Props {
  installation: {
    installationType: InstallationType | undefined
    customOptions?: Array<MultiSelectItem>
  }
  projectName: string
  onCompletion: () => void
}

const Install: FC<Props> = ({ projectName, onCompletion, installation }) => {
  const projectFolder = useMemo(() => join(process.cwd(), projectName), [projectName])
  const { installationType, customOptions } = installation

  return (
    <>
      <Divider title={`Executing ${installation.installationType ?? 'full'} installation`} />
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
              customOptions={customOptions}
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
