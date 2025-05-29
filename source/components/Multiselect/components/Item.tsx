import { Text } from 'ink'

type ItemProps = {
  isHighlighted: boolean
  label: string
}

const Item = ({ isHighlighted = false, label }: ItemProps) => (
  <Text
    color={isHighlighted ? 'green' : 'white'}
    bold={isHighlighted}
  >
    {label}
  </Text>
)

export default Item
