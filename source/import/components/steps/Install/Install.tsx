import { join } from 'node:path'
import process from 'node:process'
import { Box, Text } from 'ink'
import { Script, Spawn } from 'ink-spawn'
import React, { type FC } from 'react'
import Divider from '../../Divider.js'
import type { Installation } from '../InstallationType.js'
import type { Item as CustomOptionsItem } from '../OptionalPackages.js'
import CustomInstallation from './CustomInstallation.js'
import FullInstallation from './FullInstallation.js'

interface Props {
  installation: {
    installationType: Installation | undefined
    customOptions?: Array<CustomOptionsItem>
  }
  projectName: string
  onCompletion: () => void
}

const Install: FC<Props> = ({ projectName, onCompletion, installation }) => {
  const { installationType, customOptions } = installation
  const projectDir = join(process.cwd(), projectName)

  return (
    <>
      <Divider title={`Performing ${installation.installationType ?? 'full'} installation`} />
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
            cwd={projectDir}
            silent
            command={'cp'}
            args={['.env.example', '.env.local']}
            runningText={'Working...'}
            successText={'Done!'}
            failureText={'Error...'}
          />
          {installationType === 'full' && (
            <FullInstallation
              projectName={projectName}
              onCompletion={onCompletion}
            />
          )}
          {installationType === 'custom' && (
            <CustomInstallation
              customOptions={customOptions}
              projectName={projectName}
              onCompletion={onCompletion}
            />
          )}
        </Script>
      </Box>
    </>
  )
}

export default Install
