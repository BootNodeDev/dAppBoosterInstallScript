import { join } from 'node:path'
import process from 'node:process'
import { Box, Text } from 'ink'
import Divider from 'ink-divider'
import { Script, Spawn } from 'ink-spawn'
import React, { type FC, useState } from 'react'
import CustomInstallation from './CustomInstallation.js'
import FullInstallation from './FullInstallation.js'
import type { Installation } from './Step3.js'

interface Props {
  installation: Installation | undefined
  projectName: string
  onCompletion: () => void
}

const Step5: FC<Props> = ({ projectName, onCompletion, installation }) => {
  const projectDir = join(process.cwd(), projectName)
  const [canInstall, setCanInstall] = useState(false)

  return (
    <>
      <Divider
        titlePadding={2}
        titleColor={'whiteBright'}
        title={`Performing ${installation ?? 'full'} installation`}
      />
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

export default Step5
