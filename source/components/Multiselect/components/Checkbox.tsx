import figures from 'figures'
import { Box, Text } from 'ink'

type CheckBoxProps = {
  isSelected: boolean
}

const CheckBox = ({ isSelected = false }: CheckBoxProps) => (
  <Box marginRight={1}>
    <Text color={isSelected ? 'green' : 'white'}>
      {isSelected ? figures.circleFilled : figures.circle}
    </Text>
  </Box>
)

export default CheckBox
