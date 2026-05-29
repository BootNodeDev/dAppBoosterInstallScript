import { Box } from 'ink'
import { type FC, type ReactNode, useCallback, useMemo, useState } from 'react'
import MainTitle from './components/MainTitle.js'
import CloneRepo from './components/steps/CloneRepo/CloneRepo.js'
import FileCleanup from './components/steps/FileCleanup.js'
import Install from './components/steps/Install/Install.js'
import InstallationMode from './components/steps/InstallationMode.js'
import OptionalPackages from './components/steps/OptionalPackages.js'
import PostInstall from './components/steps/PostInstall.js'
import ProjectName from './components/steps/ProjectName.js'
import StackSelection from './components/steps/StackSelection.js'
import type { Stack } from './constants/config.js'
import type { InstallationSelectItem, MultiSelectItem } from './types/types.js'
import { canShowStep } from './utils/utils.js'

interface Props {
  preselectedStack?: Stack
}

const STACK_SELECTION_STEP = 1
const PROJECT_NAME_STEP = 2

const App: FC<Props> = ({ preselectedStack }) => {
  const [stack, setStack] = useState<Stack | undefined>(preselectedStack)
  const [projectName, setProjectName] = useState<string>('')
  const [currentStep, setCurrentStep] = useState(
    preselectedStack ? PROJECT_NAME_STEP : STACK_SELECTION_STEP,
  )
  const [setupType, setSetupType] = useState<InstallationSelectItem | undefined>()
  const [selectedFeatures, setSelectedFeatures] = useState<Array<MultiSelectItem> | undefined>()

  const finishStep = useCallback(() => setCurrentStep((prevStep) => prevStep + 1), [])
  const onSelectStack = useCallback((value: Stack) => setStack(value), [])
  const onSelectSetupType = useCallback((item: InstallationSelectItem) => setSetupType(item), [])
  const onSelectSelectedFeatures = useCallback(
    (selectedItems: Array<MultiSelectItem>) => setSelectedFeatures([...selectedItems]),
    [],
  )

  const skipFeatures = setupType?.value === 'full'

  const steps: Array<ReactNode> = useMemo(
    () => [
      <StackSelection
        onCompletion={finishStep}
        onSelect={onSelectStack}
        key={1}
      />,
      <ProjectName
        onCompletion={finishStep}
        onSubmit={setProjectName}
        projectName={projectName}
        key={2}
      />,
      stack ? (
        <CloneRepo
          stack={stack}
          onCompletion={finishStep}
          projectName={projectName}
          key={3}
        />
      ) : null,
      <InstallationMode
        onCompletion={finishStep}
        onSelect={onSelectSetupType}
        key={4}
      />,
      stack ? (
        <OptionalPackages
          stack={stack}
          onCompletion={finishStep}
          onSubmit={onSelectSelectedFeatures}
          skip={skipFeatures}
          key={5}
        />
      ) : null,
      stack ? (
        <Install
          stack={stack}
          installationConfig={{
            installationType: setupType?.value,
            selectedFeatures: selectedFeatures,
          }}
          onCompletion={finishStep}
          projectName={projectName}
          key={6}
        />
      ) : null,
      stack ? (
        <FileCleanup
          stack={stack}
          installationConfig={{
            installationType: setupType?.value,
            selectedFeatures: selectedFeatures,
          }}
          onCompletion={finishStep}
          projectName={projectName}
          key={7}
        />
      ) : null,
      stack ? (
        <PostInstall
          stack={stack}
          projectName={projectName}
          installationConfig={{
            installationType: setupType?.value,
            selectedFeatures: selectedFeatures,
          }}
          key={8}
        />
      ) : null,
    ],
    [
      finishStep,
      onSelectStack,
      onSelectSelectedFeatures,
      setupType?.value,
      selectedFeatures,
      onSelectSetupType,
      projectName,
      skipFeatures,
      stack,
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
