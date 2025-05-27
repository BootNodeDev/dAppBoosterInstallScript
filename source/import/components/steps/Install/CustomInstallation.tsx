import { Box, Text } from 'ink'
import { Script, Spawn } from 'ink-spawn'
import React, { type FC } from 'react'
import { featurePackages, homeFolder } from '../../../constants/config.js'
import type { MultiSelectItem } from '../../../types/types.js'
import InstallAllPackages from './InstallAllPackages.js'

interface Props {
  customOptions?: Array<MultiSelectItem>
  onCompletion: () => void
  projectFolder: string
}

/**
 * Performs a custom installation based on the selected features: basically we tell `pnpm` what
 * features to remove (everything's included in package.json by default to simplify things)
 * @param onCompletion
 * @param customOptions
 * @param projectFolder
 */
const CustomInstallation: FC<Props> = ({ onCompletion, customOptions, projectFolder }) => {
  const currentHomeFolder = `${projectFolder}${homeFolder}`
  const cleanHomeFile = `${projectFolder}/.install-files/home/index.tsx`

  /**
   * Selected features won't be removed, unselected features will be.
   * @param feature
   * @param featuresList
   */
  const featureSelected = (feature: string, featuresList: Array<MultiSelectItem> | undefined) => {
    return !!featuresList?.find((item: MultiSelectItem) => item.value === feature)
  }

  /**
   * Returns the packages to remove checking first if the feature is selected or not.
   * Selected features are kept, unselected features are removed.
   * @param feature
   */
  const getPackages = (feature: string) => {
    const packages = featurePackages[feature]

    return featureSelected(feature, customOptions) ? [] : packages?.length ? packages : []
  }

  // Collects the packages to remove based on the selected features and makes
  // a string out of them so that we can pass it to `pnpm remove` command.
  const packagesToRemove = [
    ...getPackages('subgraph'),
    ...getPackages('typedoc'),
    ...getPackages('vocs'),
    ...getPackages('husky'),
  ]
    .join(' ')
    .trim()

  return (
    <Box
      flexDirection={'column'}
      gap={0}
    >
      {!packagesToRemove ? (
        <Script>
          {/* If there are no packages to remove simply install everything... */}
          <InstallAllPackages
            projectFolder={projectFolder}
            onCompletion={onCompletion}
          />
        </Script>
      ) : (
        <Script>
          {/* `pnpm remove` will install the necessary packages while uninstalling the unwanted ones... */}
          <Text color={'whiteBright'}>Installing packages</Text>
          <Spawn
            shell
            cwd={projectFolder}
            silent
            command={'pnpm'}
            args={['remove', packagesToRemove]}
            runningText={'Working...'}
            successText={'Done!'}
            failureText={'Error...'}
          />
          {/* ... but it won't run the post-install script, so we run the post-install scripts manually */}
          <Text color={'whiteBright'}>Executing post-install scripts</Text>
          <Spawn
            shell
            cwd={projectFolder}
            silent
            command={'pnpm'}
            args={['run', 'postinstall']}
            runningText={'Working...'}
            successText={'Done!'}
            failureText={'Error...'}
            onCompletion={onCompletion}
          />
          {!featureSelected('demo', customOptions) && (
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
        </Script>
      )}
    </Box>
  )
}

export default CustomInstallation
