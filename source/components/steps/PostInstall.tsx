import figures from 'figures'
import { Box, Text } from 'ink'
import Link from 'ink-link'
import type { FC } from 'react'
import { featureDefinitions } from '../../config.js'
import type { FeatureName } from '../../types/types.js'
import { isFeatureSelected } from '../../utils/utils.js'
import Divider from '../Divider.js'

interface Props {
  projectName: string
  features: FeatureName[]
}

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
      {featureDefinitions.subgraph.postInstall?.map((step, index) => (
        <Text key={step}>
          {index + 1}- {step}
        </Text>
      ))}
    </Box>
    <Text>
      More configuration info in the{' '}
      <Link url={'https://docs.dappbooster.dev/introduction/getting-started'}>
        dAppBooster getting-started guide
      </Link>
      .
    </Text>
    <Text
      color={'yellow'}
      bold
    >
      {figures.info} Only after you have followed the previous steps you may proceed.
    </Text>
  </Box>
)

const PostInstall: FC<Props> = ({ projectName, features }) => (
  <>
    <Divider title={'Post-install instructions'} />
    <Box
      flexDirection={'column'}
      rowGap={2}
    >
      {isFeatureSelected('subgraph', features) && <SubgraphWarningMessage />}
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
            - dAppBooster documentation is available{' '}
            <Link url={'https://docs.dappbooster.dev/'}>here</Link>.
          </Text>
          <Text>
            - Components documentation is available{' '}
            <Link url={'https://components.dappbooster.dev/'}>here</Link>.
          </Text>
          <Text>
            - Report issues with dAppBooster in the repo's{' '}
            <Link url={'https://github.com/BootNodeDev/dAppBooster/issues'}>issue tracker</Link>.
          </Text>
        </Box>
      </Box>
    </Box>
  </>
)

export default PostInstall
