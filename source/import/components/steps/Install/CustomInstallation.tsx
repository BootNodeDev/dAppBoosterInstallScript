import { join } from 'node:path'
import process from 'node:process'
import { Box, Text } from 'ink'
import { Script, Spawn } from 'ink-spawn'
import React, { type FC } from 'react'
import { featurePackages } from '../../../constants/config.js'
import type { Item as CustomOptionsItem } from '../OptionalPackages.js'

interface Props {
  customOptions?: Array<CustomOptionsItem>
  onCompletion: () => void
  projectName: string
}

/**
 * Performs a custom installation based on the selected features: basically we tell `pnpm` what
 * features to remove (everything's included in package.json by default to simplify things)
 * @param projectName
 * @param onCompletion
 * @param customOptions
 */
const CustomInstallation: FC<Props> = ({ projectName, onCompletion, customOptions }) => {
  const projectDir = join(process.cwd(), projectName)

  /**
   * Selected features won't be removed, unselected features will be.
   * @param feature
   * @param featuresList
   */
  const featureSelected = (feature: string, featuresList: Array<CustomOptionsItem> | undefined) => {
    return !!featuresList?.find((item: CustomOptionsItem) => item.value === feature)
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
          <Text color={'whiteBright'}>Installing packages</Text>
          <Spawn
            shell
            cwd={projectDir}
            silent
            command={'pnpm'}
            args={['i']}
            runningText={'Working...'}
            successText={'Done!'}
            failureText={'Error...'}
            onCompletion={onCompletion}
          />
        </Script>
      ) : (
        <Script>
          {/* `pnpm remove` will install the necessary packages while uninstalling the unwanted ones... */}
          <Text color={'whiteBright'}>Installing packages</Text>
          <Spawn
            shell
            cwd={projectDir}
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
            cwd={projectDir}
            silent
            command={'pnpm'}
            args={['run', 'postinstall']}
            runningText={'Working...'}
            successText={'Done!'}
            failureText={'Error...'}
            // onCompletion={onCompletion}
          />
        </Script>
      )}
    </Box>
  )
}

export default CustomInstallation
