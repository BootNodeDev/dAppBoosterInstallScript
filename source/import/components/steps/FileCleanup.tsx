import { Box, Text } from 'ink'
import { Script, Spawn } from 'ink-spawn'
import React, { type FC, useMemo } from 'react'
import { homeFolder } from '../../constants/config.js'
import type { InstallationType, MultiSelectItem } from '../../types/types.js'
import { featureSelected, getProjectFolder } from '../../utils/utils.js'
import Divider from '../Divider.js'

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
  const cleanHomeFile = './.install-files/home/index.tsx'

  return (
    <>
      <Divider title={'File cleanup'} />
      <Box
        flexDirection={'column'}
        gap={0}
      >
        <Script>
          {!featureSelected('demo', selectedFeatures) && (
            <Script>
              <Text color={'whiteBright'}>Demo files</Text>
              <Spawn
                shell
                cwd={projectFolder}
                silent
                command="rm"
                args={['-rf', currentHomeFolder]}
                runningText={'Removing home files...'}
                successText={'Done!'}
                failureText={'Error...'}
              />
              <Spawn
                shell
                cwd={projectFolder}
                silent
                command="mkdir"
                args={['-p', currentHomeFolder]}
                runningText={'Creating home folder...'}
                successText={'Done!'}
                failureText={'Error...'}
              />
              <Spawn
                shell
                cwd={projectFolder}
                silent
                command="cp"
                args={[cleanHomeFile, currentHomeFolder]}
                runningText={'Creating new home page file...'}
                successText={'Done!'}
                failureText={'Error...'}
              />
            </Script>
          )}
          {!featureSelected('typedoc', selectedFeatures) && (
            <Script>
              <Text color={'whiteBright'}>Typedoc files</Text>
              <Spawn
                shell
                cwd={projectFolder}
                silent
                command="rm"
                args={['typedoc.json']}
                runningText={'Removing config...'}
                successText={'Done!'}
                failureText={'Error...'}
              />
            </Script>
          )}
          {!featureSelected('vocs', selectedFeatures) && (
            <Script>
              <Text color={'whiteBright'}>Vocs files</Text>
              <Spawn
                shell
                cwd={projectFolder}
                silent
                command="rm"
                args={['vocs.config.ts']}
                runningText={'Removing config...'}
                successText={'Done!'}
                failureText={'Error...'}
              />
              <Spawn
                shell
                cwd={projectFolder}
                silent
                command="rm"
                args={['-rf', 'docs']}
                runningText={'Removing docs folder...'}
                successText={'Done!'}
                failureText={'Error...'}
              />
            </Script>
          )}
          {!featureSelected('husky', selectedFeatures) && (
            <Script>
              <Text color={'whiteBright'}>Husky files</Text>
              <Spawn
                shell
                cwd={projectFolder}
                silent
                command="rm"
                args={['-rf', '.husky']}
                runningText={'Removing Husky folder...'}
                successText={'Done!'}
                failureText={'Error...'}
              />
              <Spawn
                shell
                cwd={projectFolder}
                silent
                command="rm"
                args={['.lintstagedrc.mjs']}
                runningText={'Removing lint-staged config...'}
                successText={'Done!'}
                failureText={'Error...'}
              />
              <Spawn
                shell
                cwd={projectFolder}
                silent
                command="rm"
                args={['commitlint.config.js']}
                runningText={'Removing commitlint config...'}
                successText={'Done!'}
                failureText={'Error...'}
              />
            </Script>
          )}
          <Text color={'whiteBright'}>Install files</Text>
          <Spawn
            shell
            cwd={projectFolder}
            silent
            command="rm"
            args={['-rf', '.install-files']}
            runningText={'Removing folder...'}
            successText={'Done!'}
            failureText={'Error...'}
          />
        </Script>
      </Box>
    </>
  )
}

export default FileCleanup
