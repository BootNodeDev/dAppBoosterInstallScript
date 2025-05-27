import { Box, Text } from 'ink'
import React, { useState, type ReactNode } from 'react'
import MainTitle from './import/MainTitle.js'
import Step1 from './import/Step1.js'
import Step2 from './import/Step2.js'
import Step3, { type Item } from './import/Step3.js'
import { canShowStep } from './import/utils.js'

const App = () => {
  const [projectName, setProjectName] = useState<string>('')
  const [currentStep, setCurrentStep] = useState(1)
  const [setupOption, setSetupOption] = useState<Item | undefined>()

  const finishStep = () => setCurrentStep(currentStep + 1)
  const onSelect = (item: Item) => setSetupOption(item)

  const steps: Array<ReactNode> = [
    <Step1
      onSubmit={setProjectName}
      onCompletion={finishStep}
      projectName={projectName}
      key={1}
    />,
    <Step2
      onCompletion={finishStep}
      projectName={projectName}
      key={2}
    />,
    <Step3
      onCompletion={finishStep}
      onSelect={onSelect}
      key={3}
    />,
  ]

  return (
    <Box
      flexDirection={'column'}
      rowGap={1}
    >
      <MainTitle />
      {steps.map((item, index) => canShowStep(currentStep, index + 1) && item)}
      {canShowStep(currentStep, 4) && <Text>{setupOption?.value}</Text>}
    </Box>
  )
}

export default App
