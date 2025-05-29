import { Box } from 'ink'
import { type ReactNode, useCallback, useMemo, useState } from 'react'
import MainTitle from './components/MainTitle.js'
import CloneRepo from './components/steps/CloneRepo/CloneRepo.js'
import FileCleanup from './components/steps/FileCleanup.js'
import Install from './components/steps/Install/Install.js'
import InstallationMode from './components/steps/InstallationMode.js'
import OptionalPackages from './components/steps/OptionalPackages.js'
import PostInstall from './components/steps/PostInstall.js'
import ProjectName from './components/steps/ProjectName.js'
import type { InstallationSelectItem, MultiSelectItem } from './types/types.js'
import { canShowStep } from './utils/utils.js'

const App = () => {
  const [projectName, setProjectName] = useState<string>('')
  const [currentStep, setCurrentStep] = useState(1)
  const [setupType, setSetupType] = useState<InstallationSelectItem | undefined>()
  const [selectedFeatures, setSelectedFeatures] = useState<Array<MultiSelectItem> | undefined>()

  const finishStep = useCallback(() => setCurrentStep(currentStep + 1), [currentStep])
  const onSelectSetupType = useCallback((item: InstallationSelectItem) => setSetupType(item), [])
  const onSelectSelectedFeatures = useCallback(
    (selectedItems: Array<MultiSelectItem>) => setSelectedFeatures([...selectedItems]),
    [],
  )

  const steps: Array<ReactNode> = useMemo(
    () => [
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
      // TODO: add a skip parameter to all (or most) steps
      // to allow skipping when testing, etc.
      <OptionalPackages
        onCompletion={finishStep}
        onSubmit={onSelectSelectedFeatures}
        skip={setupType?.value === 'full'}
        key={4}
      />,
      <Install
        installationConfig={{
          installationType: setupType?.value,
          selectedFeatures: selectedFeatures,
        }}
        onCompletion={finishStep}
        projectName={projectName}
        key={5}
      />,
      <FileCleanup
        installationConfig={{
          installationType: setupType?.value,
          selectedFeatures: selectedFeatures,
        }}
        onCompletion={finishStep}
        projectName={projectName}
        key={6}
      />,
      <PostInstall
        projectName={projectName}
        installationConfig={{
          installationType: setupType?.value,
          selectedFeatures: selectedFeatures,
        }}
        key={7}
      />,
    ],
    [
      finishStep,
      onSelectSelectedFeatures,
      setupType?.value,
      selectedFeatures,
      onSelectSetupType,
      projectName,
    ],
  )

  return (
    <Box
      flexDirection={'column'}
      rowGap={1}
      width={80}
    >
      <MainTitle />
      {steps.map((item, index) => canShowStep(currentStep, index + 1) && item)}
    </Box>
  )
}

export default App
