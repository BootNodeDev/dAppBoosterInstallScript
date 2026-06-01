import { Box } from 'ink'
import { type FC, type ReactNode, useCallback, useMemo, useState } from 'react'
import MainTitle from './components/MainTitle.js'
import CloneRepo from './components/steps/CloneRepo/CloneRepo.js'
import Confirmation from './components/steps/Confirmation.js'
import FileCleanup from './components/steps/FileCleanup.js'
import Install from './components/steps/Install/Install.js'
import InstallationMode from './components/steps/InstallationMode.js'
import OptionalPackages from './components/steps/OptionalPackages.js'
import PostInstall from './components/steps/PostInstall.js'
import ProjectName from './components/steps/ProjectName.js'
import StackSelection from './components/steps/StackSelection.js'
import type { FeatureName, Stack } from './constants/config.js'
import type { InstallationSelectItem, MultiSelectItem } from './types/types.js'
import { canShowStep, describeInstallPlan } from './utils/utils.js'

interface Props {
  preselectedStack?: Stack
}

const App: FC<Props> = ({ preselectedStack }) => {
  const [stack, setStack] = useState<Stack | undefined>(preselectedStack)
  const [projectName, setProjectName] = useState<string>('')
  const [currentStep, setCurrentStep] = useState(1)
  const [setupType, setSetupType] = useState<InstallationSelectItem | undefined>()
  const [selectedFeatures, setSelectedFeatures] = useState<Array<MultiSelectItem> | undefined>()
  // Bumped when the user cancels at the confirmation step; re-keys every step so they re-mount
  // fresh for a clean re-run of the wizard.
  const [attempt, setAttempt] = useState(0)

  const finishStep = useCallback(() => setCurrentStep((prevStep) => prevStep + 1), [])
  const onSelectStack = useCallback((value: Stack) => setStack(value), [])
  const onSelectSetupType = useCallback((item: InstallationSelectItem) => setSetupType(item), [])
  const onSelectSelectedFeatures = useCallback(
    (selectedItems: Array<MultiSelectItem>) => setSelectedFeatures([...selectedItems]),
    [],
  )

  // Confirmation "No": discard the answers and return to the first question. No disk work has
  // happened yet, so this is a clean restart.
  const restart = useCallback(() => {
    setProjectName('')
    setSetupType(undefined)
    setSelectedFeatures(undefined)
    setStack(preselectedStack)
    setCurrentStep(1)
    setAttempt((prev) => prev + 1)
  }, [preselectedStack])

  const skipFeatures = setupType?.value === 'full'

  const mode = setupType?.value ?? 'full'
  const planFeatures = selectedFeatures?.map((item) => item.value as FeatureName) ?? []
  const planSummary =
    stack === undefined ? '' : describeInstallPlan(stack, projectName, mode, planFeatures)

  const steps: Array<ReactNode> = useMemo(() => {
    // Questions first (no disk writes), operations last. This way an interrupt while answering
    // leaves nothing behind, and all cloning/installing happens only after the confirmation.
    const orderedSteps: Array<ReactNode> = [
      <ProjectName
        onCompletion={finishStep}
        onSubmit={setProjectName}
        key={`project-name-${attempt}`}
      />,
    ]

    if (!preselectedStack) {
      orderedSteps.push(
        <StackSelection
          onCompletion={finishStep}
          onSelect={onSelectStack}
          key={`stack-selection-${attempt}`}
        />,
      )
    }

    if (stack === undefined) {
      return orderedSteps
    }

    // --- remaining questions (need the stack) ---
    orderedSteps.push(
      <InstallationMode
        onCompletion={finishStep}
        onSelect={onSelectSetupType}
        key={`installation-mode-${attempt}`}
      />,
    )

    orderedSteps.push(
      <OptionalPackages
        stack={stack}
        onCompletion={finishStep}
        onSubmit={onSelectSelectedFeatures}
        skip={skipFeatures}
        key={`optional-packages-${attempt}`}
      />,
    )

    orderedSteps.push(
      <Confirmation
        summary={planSummary}
        onConfirm={finishStep}
        onCancel={restart}
        key={`confirmation-${attempt}`}
      />,
    )

    // --- operations (disk writes) ---
    orderedSteps.push(
      <CloneRepo
        stack={stack}
        onCompletion={finishStep}
        projectName={projectName}
        key={`clone-repo-${attempt}`}
      />,
    )

    orderedSteps.push(
      <Install
        stack={stack}
        installationConfig={{
          installationType: setupType?.value,
          selectedFeatures: selectedFeatures,
        }}
        onCompletion={finishStep}
        projectName={projectName}
        key={`install-${attempt}`}
      />,
    )

    orderedSteps.push(
      <FileCleanup
        stack={stack}
        installationConfig={{
          installationType: setupType?.value,
          selectedFeatures: selectedFeatures,
        }}
        onCompletion={finishStep}
        projectName={projectName}
        key={`file-cleanup-${attempt}`}
      />,
    )

    orderedSteps.push(
      <PostInstall
        stack={stack}
        projectName={projectName}
        installationConfig={{
          installationType: setupType?.value,
          selectedFeatures: selectedFeatures,
        }}
        key={`post-install-${attempt}`}
      />,
    )

    return orderedSteps
  }, [
    finishStep,
    onSelectStack,
    onSelectSelectedFeatures,
    setupType?.value,
    selectedFeatures,
    onSelectSetupType,
    projectName,
    skipFeatures,
    stack,
    preselectedStack,
    attempt,
    planSummary,
    restart,
  ])

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
