import { Box, Text } from 'ink'
import React, { useState, type ReactNode } from 'react'
import MainTitle from './import/components/MainTitle.js'
import CloneRepo from './import/components/steps/CloneRepo/CloneRepo.js'
import Install from './import/components/steps/Install/Install.js'
import InstallationMode from './import/components/steps/InstallationMode.js'
import OptionalPackages from './import/components/steps/OptionalPackages.js'
import ProjectName from './import/components/steps/ProjectName.js'
import type { InstallationSelectItem, MultiSelectItem } from './import/types/types.js'
import { canShowStep } from './import/utils/utils.js'

const App = () => {
  const [projectName, setProjectName] = useState<string>('')
  const [currentStep, setCurrentStep] = useState(1)
  const [setupType, setSetupType] = useState<InstallationSelectItem | undefined>()
  const [customOptions, setCustomOptions] = useState<Array<MultiSelectItem> | undefined>()

  const finishStep = () => setCurrentStep(currentStep + 1)
  const onSelectSetupType = (item: InstallationSelectItem) => setSetupType(item)
  const onSelectCustomOptions = (selectedItems: Array<MultiSelectItem>) =>
    setCustomOptions([...selectedItems])

  const steps: Array<ReactNode> = [
    <ProjectName
      onCompletion={finishStep}
      onSubmit={setProjectName}
      projectName={projectName}
      key={1}
    />,
    <CloneRepo
      onCompletion={finishStep}
      projectName={projectName}
      key={2}
    />,
    <InstallationMode
      onCompletion={finishStep}
      onSelect={onSelectSetupType}
      key={3}
    />,
    <OptionalPackages
      installation={setupType?.value}
      onCompletion={finishStep}
      onSubmit={onSelectCustomOptions}
      key={4}
    />,
    <Install
      installation={{ installationType: setupType?.value, customOptions: customOptions }}
      onCompletion={finishStep}
      projectName={projectName}
      key={5}
    />,
    <Text key={6}>Done!</Text>,
  ]

  return (
    <Box
      flexDirection={'column'}
      rowGap={1}
    >
      <MainTitle />
      {steps.map((item, index) => canShowStep(currentStep, index + 1) && item)}
    </Box>
  )
}

export default App
