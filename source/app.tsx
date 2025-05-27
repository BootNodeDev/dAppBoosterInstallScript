import { Box, Text } from 'ink'
import React, { useState, type ReactNode } from 'react'
import MainTitle from './import/MainTitle.js'
import Step1 from './import/Step1.js'
import Step2 from './import/Step2.js'
import Step3, { type Item as SetupTypeItem } from './import/Step3.js'
import Step4, { type Item as CustomOptionsItem } from './import/Step4.js'
import Step5 from './import/Step5.js'
import { canShowStep } from './import/utils.js'

const App = () => {
  const [projectName, setProjectName] = useState<string>('')
  const [currentStep, setCurrentStep] = useState(1)
  const [setupType, setSetupType] = useState<SetupTypeItem | undefined>()
  const [customOptions, setCustomOptions] = useState<Array<CustomOptionsItem> | undefined>()

  const finishStep = () => setCurrentStep(currentStep + 1)
  const onSelectSetupType = (item: SetupTypeItem) => setSetupType(item)
  const onSelectCustomOptions = (selectedItems: Array<CustomOptionsItem>) =>
    setCustomOptions([...selectedItems])

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
      onSelect={onSelectSetupType}
      key={3}
    />,
    <Step4
      onCompletion={finishStep}
      onSubmit={onSelectCustomOptions}
      installation={setupType?.value}
      key={4}
    />,
    <Step5
      onCompletion={finishStep}
      projectName={projectName}
      installation={setupType?.value}
      key={5}
    />,
  ]

  return (
    <Box
      flexDirection={'column'}
      rowGap={1}
    >
      <MainTitle />
      {steps.map((item, index) => canShowStep(currentStep, index + 1) && item)}
      {customOptions?.map((item, index) => (
        <Text key={index}>
          {item.label} / {item.value}
        </Text>
      ))}
    </Box>
  )
}

export default App
