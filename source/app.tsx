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
import type { FeatureName, InstallationSelectItem, MultiSelectItem, Stack } from './types/types.js'
import { canShowStep, describeInstallPlan, resolveModeFeatures } from './utils/utils.js'

const stack: Stack = 'evm'

const App: FC = () => {
  const [projectName, setProjectName] = useState<string>('')
  const [currentStep, setCurrentStep] = useState(1)
  const [setupType, setSetupType] = useState<InstallationSelectItem | undefined>()
  const [selectedFeatures, setSelectedFeatures] = useState<Array<MultiSelectItem> | undefined>()
  const [attempt, setAttempt] = useState(0)

  const finishStep = useCallback(() => setCurrentStep((prevStep) => prevStep + 1), [])
  const onSelectSetupType = useCallback((item: InstallationSelectItem) => setSetupType(item), [])
  const onSelectSelectedFeatures = useCallback(
    (selectedItems: Array<MultiSelectItem>) => setSelectedFeatures([...selectedItems]),
    [],
  )

  const restart = useCallback(() => {
    setProjectName('')
    setSetupType(undefined)
    setSelectedFeatures(undefined)
    setCurrentStep(1)
    setAttempt((prev) => prev + 1)
  }, [])

  const skipFeatures = setupType?.value === 'full' || setupType?.value === 'default'

  const mode = setupType?.value ?? 'full'

  const features = useMemo(() => {
    const selectedNames = selectedFeatures?.map((item) => item.value as FeatureName) ?? []
    return resolveModeFeatures(stack, mode, selectedNames)
  }, [mode, selectedFeatures])

  // Memoised because it feeds the step list below, which would otherwise rebuild on every render.
  const planSummary = useMemo(
    () => describeInstallPlan(projectName, mode, features),
    [projectName, mode, features],
  )

  const steps: Array<ReactNode> = useMemo(
    () => [
      <ProjectName
        onCompletion={finishStep}
        onSubmit={setProjectName}
        key={`project-name-${attempt}`}
      />,
      <InstallationMode
        stack={stack}
        onCompletion={finishStep}
        onSelect={onSelectSetupType}
        key={`installation-mode-${attempt}`}
      />,
      <OptionalPackages
        stack={stack}
        onCompletion={finishStep}
        onSubmit={onSelectSelectedFeatures}
        skip={skipFeatures}
        key={`optional-packages-${attempt}`}
      />,
      <Confirmation
        summary={planSummary}
        onConfirm={finishStep}
        onCancel={restart}
        key={`confirmation-${attempt}`}
      />,
      <CloneRepo
        stack={stack}
        onCompletion={finishStep}
        projectName={projectName}
        key={`clone-repo-${attempt}`}
      />,
      <FileCleanup
        stack={stack}
        mode={mode}
        features={features}
        onCompletion={finishStep}
        projectName={projectName}
        key={`file-cleanup-${attempt}`}
      />,
      <Install
        stack={stack}
        mode={mode}
        features={features}
        onCompletion={finishStep}
        projectName={projectName}
        key={`install-${attempt}`}
      />,
      <PostInstall
        features={features}
        projectName={projectName}
        key={`post-install-${attempt}`}
      />,
    ],
    [
      finishStep,
      onSelectSelectedFeatures,
      onSelectSetupType,
      mode,
      features,
      projectName,
      skipFeatures,
      attempt,
      planSummary,
      restart,
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
