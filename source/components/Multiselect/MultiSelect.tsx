import { Box, useInput } from 'ink'
import { createElement, useCallback, useState } from 'react'
import CheckBox from './components/Checkbox.js'
import Indicator from './components/Indicator.js'
import ItemComponent from './components/Item.js'

type Item<T> = {
  label: string
  value: T
  key?: string | number
}

type MultiSelectProps<T> = {
  items: Item<T>[]
  defaultSelected?: Item<T>[]
  focus?: boolean
  initialIndex?: number
  indicatorComponent?: React.FC<{ isHighlighted: boolean }>
  checkboxComponent?: React.FC<{ isSelected: boolean }>
  itemComponent?: React.FC<{ isHighlighted: boolean; label: string }>
  limit?: number | null
  onSelect?: (selectedItem: Item<T>) => void
  onUnselect?: (unselectedItem: Item<T>) => void
  onSubmit?: (selectedItems: Item<T>[]) => void
  onHighlight?: (highlightedItem: Item<T>) => void
}

const MultiSelect = <T,>({
  items = [],
  defaultSelected = [],
  focus = true,
  initialIndex = 0,
  indicatorComponent = Indicator,
  checkboxComponent = CheckBox,
  itemComponent = ItemComponent,
  limit = null,
  onSelect = () => {},
  onUnselect = () => {},
  onSubmit = () => {},
  onHighlight = () => {},
}: MultiSelectProps<T>) => {
  const [highlightedIndex, setHighlightedIndex] = useState(initialIndex)
  const [selectedItems, setSelectedItems] = useState(defaultSelected)

  const hasLimit = limit !== null && limit < items.length

  const slicedItems = hasLimit ? items.slice(0, limit) : items

  const isSameItem = useCallback(
    (one: Item<T>, other: Item<T>) => one.value === other.value && one.label === other.label,
    [],
  )

  const includesItems = useCallback(
    (item: Item<T>, selectedItems: Item<T>[]) =>
      selectedItems.some((selectedItem) => isSameItem(selectedItem, item)),
    [isSameItem],
  )

  const handleSelect = useCallback(
    (item: Item<T>) => {
      if (includesItems(item, selectedItems)) {
        setSelectedItems(selectedItems.filter((selectedItem) => !isSameItem(selectedItem, item)))
        onUnselect(item)
      } else {
        setSelectedItems([...selectedItems, item])
        onSelect(item)
      }
    },
    [selectedItems, onSelect, onUnselect, includesItems, isSameItem],
  )

  const handleSubmit = useCallback(() => {
    onSubmit(selectedItems)
  }, [selectedItems, onSubmit])

  useInput(
    useCallback(
      (input, key) => {
        const highlight = (index: number) => {
          const item = slicedItems[index]
          if (item) {
            onHighlight(item)
          }
          return index
        }

        if (key.upArrow) {
          setHighlightedIndex((prevIndex) =>
            highlight(prevIndex === 0 ? slicedItems.length - 1 : prevIndex - 1),
          )
        } else if (key.downArrow) {
          setHighlightedIndex((prevIndex) =>
            highlight(prevIndex === slicedItems.length - 1 ? 0 : prevIndex + 1),
          )
        } else if (key.return) {
          handleSubmit()
        } else if (input === ' ') {
          const item = slicedItems[highlightedIndex]
          if (item) {
            handleSelect(item)
          }
        }
      },
      [onHighlight, handleSelect, handleSubmit, slicedItems, highlightedIndex],
    ),
    { isActive: focus },
  )

  return (
    <Box flexDirection="column">
      {slicedItems.map((item, index) => {
        const key = item.key || item.label
        const isHighlighted = index === highlightedIndex
        const isSelected = includesItems(item, selectedItems)

        return (
          <Box key={key}>
            {createElement(indicatorComponent, { isHighlighted })}
            {createElement(checkboxComponent, { isSelected })}
            {createElement(itemComponent, {
              ...item,
              isHighlighted,
            })}
          </Box>
        )
      })}
    </Box>
  )
}

export default MultiSelect
