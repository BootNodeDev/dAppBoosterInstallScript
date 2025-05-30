import figures from 'figures'
import { Box, Text } from 'ink'

type IndicatorProps = {
  isHighlighted: boolean
}

const Indicator = ({ isHighlighted = false }: IndicatorProps) => (
  <Box marginRight={1}>
    <Text color={isHighlighted ? 'green' : undefined}>{isHighlighted ? figures.pointer : ' '}</Text>
  </Box>
)

export default Indicator
