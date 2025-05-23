import React, { useState } from 'react'
import { Text } from 'ink'
import { Ask } from './import/Ask.js'

const App = () => {
  const [project, setProject] = useState<string | null>(null)

  return !project ? (
    <Ask question="Project name?" onSubmit={setProject} />
  ) : (
    <Text>Project name: {project}</Text>
  )
}

export default App
