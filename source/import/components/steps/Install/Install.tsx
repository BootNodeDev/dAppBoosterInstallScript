import { join } from 'node:path'
import process from 'node:process'
import { Box, Text } from 'ink'
import { Script, Spawn } from 'ink-spawn'
import React, { type FC, useState } from 'react'
import Divider from '../../Divider.js'
import type { Installation } from '../InstallationType.js'
import CustomInstallation from './CustomInstallation.js'
import FullInstallation from './FullInstallation.js'

interface Props {
  installation: Installation | undefined
  projectName: string
  onCompletion: () => void
}

const Install: FC<Props> = ({ projectName, onCompletion, installation }) => {
  const projectDir = join(process.cwd(), projectName)
  const [canInstall, setCanInstall] = useState(false)

  return (
    <>
      <Divider title={`Performing ${installation ?? 'full'} installation`} />
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
            onCompletion={() => setCanInstall(true)}
          />
        </Script>
        {canInstall && installation === 'full' ? (
          <FullInstallation
            projectName={projectName}
            onCompletion={() => console.log()}
          />
        ) : (
          <CustomInstallation
            projectName={projectName}
            onCompletion={() => console.log()}
          />
        )}
      </Box>
    </>
  )
}

export default Install
