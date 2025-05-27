import { Box, Text } from 'ink'
import React, { useState, type ReactNode } from 'react'
import MainTitle from './import/components/MainTitle.js'
import CloneRepo from './import/components/steps/CloneRepo/CloneRepo.js'
import Install from './import/components/steps/Install/Install.js'
import InstallationType, {
  type Item as SetupTypeItem,
} from './import/components/steps/InstallationType.js'
import OptionalPackages, {
  type Item as CustomOptionsItem,
} from './import/components/steps/OptionalPackages.js'
import ProjectName from './import/components/steps/ProjectName.js'
import { canShowStep } from './import/utils/utils.js'

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
    <ProjectName
      onSubmit={setProjectName}
      onCompletion={finishStep}
      projectName={projectName}
      key={1}
    />,
    <CloneRepo
      onCompletion={finishStep}
      projectName={projectName}
      key={2}
    />,
    <InstallationType
      onCompletion={finishStep}
      onSelect={onSelectSetupType}
      key={3}
    />,
    <OptionalPackages
      onCompletion={finishStep}
      onSubmit={onSelectCustomOptions}
      installation={setupType?.value}
      key={4}
    />,
    <Install
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
      {customOptions?.map((item) => (
        <Text key={item.value}>
          {item.label} / {item.value}
        </Text>
      ))}
    </Box>
  )
}

export default App
