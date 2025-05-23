import React, { type FC, useState } from 'react'
import { Box, Text } from 'ink'
import TextInput from 'ink-text-input'

interface Props {
  question: string
  onSubmit: (value: string) => void
}

export const Ask: FC<Props> = ({ question, onSubmit }) => {
  const [query, setQuery] = useState('')
  const [submitted, setSubmitted] = useState(false)
  
  return submitted ? null : (
    <Box>
      <Box>
        <Text>{question}:</Text>
      </Box>
      <TextInput
        onChange={setQuery}
        onSubmit={(value) => {
          setSubmitted(true)
          onSubmit(value)
        }}
        value={query}
      />
    </Box>
  )
}
