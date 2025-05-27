import { Box, Text } from 'ink'
import { Script, Spawn } from 'ink-spawn'
import React, { type FC } from 'react'
import type { MultiSelectItem } from '../../../types/types.js'
import { getPackages } from '../../../utils/utils.js'
import InstallAllPackages from './InstallAllPackages.js'

interface Props {
  onCompletion: () => void
  projectFolder: string
  selectedFeatures?: Array<MultiSelectItem>
}

/**
 * Performs a custom installation based on the selected features: basically we tell `pnpm` what
 * features to remove (everything's included in package.json by default to simplify things)
 * @param onCompletion
 * @param selectedFeatures
 * @param projectFolder
 */
const CustomInstallation: FC<Props> = ({ onCompletion, selectedFeatures, projectFolder }) => {
  // Collects the packages to remove based on the selected features and makes
  // a string out of them so that we can pass it to `pnpm remove` command.
  const packagesToRemove = [
    ...getPackages('subgraph', selectedFeatures),
    ...getPackages('typedoc', selectedFeatures),
    ...getPackages('vocs', selectedFeatures),
    ...getPackages('husky', selectedFeatures),
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
          {/* `pnpm remove` will install the necessary packages and then uninstall the unwanted ones... */}
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
        </Script>
      )}
    </Box>
  )
}

export default CustomInstallation
