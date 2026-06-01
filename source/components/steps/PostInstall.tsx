import figures from 'figures'
import { Box, Text } from 'ink'
import Link from 'ink-link'
import type { FC } from 'react'
import { type FeatureName, type Stack, getStackConfig } from '../../constants/config.js'
import type { InstallationType, MultiSelectItem } from '../../types/types.js'
import { isFeatureSelected } from '../../utils/utils.js'
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

const EvmPostInstallMessage: FC<{ projectName: string }> = ({ projectName }) => (
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

const CantonPostInstallMessage: FC<{
  projectName: string
  features: FeatureName[]
  installationType: InstallationType | undefined
}> = ({ projectName, features, installationType }) => {
  const isFull = installationType === 'full'
  const counterEnabled = isFull || isFeatureSelected('counter', features)
  const carpinchoEnabled = isFull || isFeatureSelected('carpincho', features)

  return (
    <Box
      flexDirection={'column'}
      rowGap={1}
      paddingBottom={2}
    >
      <Text color={'whiteBright'}>To start the Canton stack:</Text>
      <Box flexDirection={'column'}>
        <Text>
          1- Move into the project's folder with <Text color={'gray'}>cd {projectName}</Text>
        </Text>
        <Text>
          2- Configure canton-barebones: <Text color={'gray'}>canton-barebones/.env</Text> was
          created from the example — review it.
        </Text>
        <Text>
          3- Start the local Canton stack with <Text color={'gray'}>npm run canton:up</Text>
        </Text>
        {counterEnabled && (
          <Text>
            4- In a separate terminal, run the counter dapp:{' '}
            <Text color={'gray'}>npm run app:dev</Text>
          </Text>
        )}
      </Box>
      {carpinchoEnabled && (
        <Box
          alignItems={'center'}
          borderColor={'yellow'}
          borderStyle={'bold'}
          flexDirection={'column'}
          justifyContent={'center'}
          padding={1}
        >
          <Text color={'yellow'}>
            {figures.info} <Text bold>Carpincho Wallet</Text>: build it with{' '}
            <Text color={'gray'}>npm run carpincho:build:extension</Text> and load{' '}
            <Text color={'gray'}>carpincho-wallet/dist-extension</Text> as an unpacked browser
            extension {figures.info}
          </Text>
        </Box>
      )}
      <Text>See the Canton stack README inside the project for full instructions.</Text>
    </Box>
  )
}

interface Props {
  stack: Stack
  installationConfig: {
    installationType: InstallationType | undefined
    selectedFeatures?: Array<MultiSelectItem>
  }
  projectName: string
}

const PostInstall: FC<Props> = ({ stack, installationConfig, projectName }) => {
  const { selectedFeatures, installationType } = installationConfig
  const features = selectedFeatures?.map((f) => f.value as FeatureName) ?? []
  const stackLabel = getStackConfig(stack).label

  return (
    <>
      <Divider title={`Post-install instructions — ${stackLabel}`} />
      <Box
        flexDirection={'column'}
        rowGap={2}
      >
        {stack === 'evm' &&
          (isFeatureSelected('subgraph', features) || installationType === 'full') && (
            <SubgraphWarningMessage />
          )}
        {stack === 'evm' && <EvmPostInstallMessage projectName={projectName} />}
        {stack === 'canton' && (
          <CantonPostInstallMessage
            projectName={projectName}
            features={features}
            installationType={installationType}
          />
        )}
      </Box>
    </>
  )
}

export default PostInstall
