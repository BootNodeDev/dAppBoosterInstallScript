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
  const currentHomeFolder = `${projectFolder}/src/components/pageComponents/home`

  return (
    <>
      <Divider title={'File cleanup'} />
      <Box
        flexDirection={'column'}
        gap={0}
      >
        <Script>
          {/* Component demos files and folders */}
          {!featureSelected('demo', selectedFeatures) && (
            <Script>
              <Text color={'whiteBright'}>Component demos</Text>
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
                args={['.install-files/home/index.tsx', currentHomeFolder]}
                runningText={'Creating new home page file...'}
                successText={'Done!'}
                failureText={'Error...'}
              />
            </Script>
          )}
          {/* Subgraph files and folders */}
          {!featureSelected('subgraph', selectedFeatures) && (
            <Script>
              <Text color={'whiteBright'}>Subgraph</Text>
              <Spawn
                shell
                cwd={projectFolder}
                silent
                command="rm"
                args={['-rf', 'src/subgraphs']}
                runningText={'Removing subgraphs folder...'}
                successText={'Done!'}
                failureText={'Error...'}
              />
              {/* The user chose to keep the component demos but opted out of subgraph support */}
              {featureSelected('demo', selectedFeatures) && (
                <Script>
                  <Spawn
                    shell
                    cwd={projectFolder}
                    silent
                    command="rm"
                    args={['-rf', `${currentHomeFolder}/Examples/demos/subgraphs`]}
                    runningText={'Removing subgraphs demos folder...'}
                    successText={'Done!'}
                    failureText={'Error...'}
                  />
                  <Spawn
                    shell
                    cwd={projectFolder}
                    silent
                    command="cp"
                    args={[
                      '.install-files/home/Examples/index.tsx',
                      `${currentHomeFolder}/index.tsx`,
                    ]}
                    runningText={'Creating new home page file...'}
                    successText={'Done!'}
                    failureText={'Error...'}
                  />
                </Script>
              )}
            </Script>
          )}
          {/* Typedoc files and folders */}
          {!featureSelected('typedoc', selectedFeatures) && (
            <Script>
              <Text color={'whiteBright'}>Typedoc</Text>
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
          {/* Vocs files and folders */}
          {!featureSelected('vocs', selectedFeatures) && (
            <Script>
              <Text color={'whiteBright'}>Vocs</Text>
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
          {/* Husky files and folders */}
          {/* Also removes files from tasks executed by Husky:
              - lint-staged
              - commitlint
          */}
          {!featureSelected('husky', selectedFeatures) && (
            <Script>
              <Text color={'whiteBright'}>Husky</Text>
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
          {/* Install script files and folders */}
          <Text color={'whiteBright'}>Install script</Text>
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
