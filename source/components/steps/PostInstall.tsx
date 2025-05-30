import figures from 'figures'
import { Box, Text } from 'ink'
import Link from 'ink-link'
import type { FC } from 'react'
import type { InstallationType, MultiSelectItem } from '../../types/types.js'
import { featureSelected } from '../../utils/utils.js'
import Divider from '../Divider.js'

const SubgraphWarningMessage: FC = () => (
  <Box
    flexDirection={'column'}
    rowGap={1}
  >
    <Box
      alignItems={'center'}
      borderColor={'yellow'}
      borderStyle={'bold'}
      flexDirection={'column'}
      justifyContent={'center'}
      padding={1}
    >
      <Text color={'yellow'}>
        {figures.warning}
        {figures.warning} <Text bold>WARNING:</Text> You <Text bold>MUST</Text> finish the
        subgraph's configuration manually {figures.warning}
        {figures.warning}
      </Text>
    </Box>
    <Text color={'whiteBright'}>Follow these steps:</Text>
    <Box flexDirection={'column'}>
      <Text>
        1- Provide your own API key for <Text color={'gray'}>PUBLIC_SUBGRAPHS_API_KEY</Text> in{' '}
        <Text color={'gray'}>.env.local</Text> You can get one{' '}
        <Link url="https://thegraph.com/studio/apikeys">here</Link>
      </Text>
      <Text>
        2- After the API key is correctly configured, run{' '}
        <Text color={'gray'}>pnpm subgraph-codegen</Text> in your console from the project's folder
      </Text>
    </Box>
    <Text>
      More configuration info in{' '}
      <Link url={'https://docs.dappbooster.dev/introduction/getting-started'}>the docs</Link>.
    </Text>
    <Text
      color={'yellow'}
      bold
    >
      {figures.info} Only after you have followed the previous steps you may proceed.
    </Text>
  </Box>
)

const PostInstallMessage: FC<{ projectName: string }> = ({ projectName }) => (
  <Box
    flexDirection={'column'}
    rowGap={1}
    paddingBottom={2}
  >
    <Text color={'whiteBright'}>To start development on your project:</Text>
    <Box flexDirection={'column'}>
      <Text>
        1- Move into the project's folder with <Text color={'gray'}>cd {projectName}</Text>
      </Text>
      <Text>
        2- Start the development server with <Text color={'gray'}>pnpm dev</Text>
      </Text>
    </Box>
    <Text color={'whiteBright'}>More info:</Text>
    <Box flexDirection={'column'}>
      <Text>
        - Check out <Text color={'gray'}>.env.local</Text> for more configurations.
      </Text>
      <Text>
        - Read <Link url="https://docs.dappbooster.dev">the docs</Link> to know more about{' '}
        <Text color={'gray'}>dAppBooster</Text>!
      </Text>
      <Text>
        - Report issues with this installer{' '}
        <Link url="https://github.com/BootNodeDev/dAppBoosterInstallScript/issues">here</Link>
      </Text>
    </Box>
  </Box>
)

interface Props {
  installationConfig: {
    installationType: InstallationType | undefined
    selectedFeatures?: Array<MultiSelectItem>
  }
  projectName: string
}

/**
 * Component to ask for the project name.
 * @param selectedFeatures
 * @param projectName
 */
const PostInstall: FC<Props> = ({ installationConfig, projectName }) => {
  const { selectedFeatures, installationType } = installationConfig
  const subgraphSupport = featureSelected('subgraph', selectedFeatures)

  return (
    <>
      <Divider title={'Post-install instructions'} />
      <Box
        flexDirection={'column'}
        rowGap={2}
      >
        {(subgraphSupport || installationType === 'full') && <SubgraphWarningMessage />}
        <PostInstallMessage projectName={projectName} />
      </Box>
    </>
  )
}

export default PostInstall
