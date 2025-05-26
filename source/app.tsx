import React, { useEffect, useState, useMemo } from 'react'
import CloneRepo from './import/CloneRepo.js'
import ProjectName from './import/ProjectName.js'
import Step1 from './import/Step1.js'
import { Box } from 'ink'
import { validateName, isAnswerConfirmed } from './import/utils.js'
import Divider from 'ink-divider'

const App = () => {
  const [projectName, setProjectName] = useState<string>('')
  const [errorMessage, setErrormessage] = useState<string | undefined>()
  const [step, setStep] = useState(1)
  const isProjectNameSet = useMemo(
    () => isAnswerConfirmed(projectName, errorMessage),
    [projectName, errorMessage],
  )

  useEffect(() => {
    setErrormessage(validateName(projectName))
  }, [projectName])

  const finishStep = () => setStep(step + 1)

  const canShowStep = (currentStep: number) => {
    return step > currentStep - 1
  }

  return (
    <Box flexDirection={'column'} rowGap={1}>
      <ProjectName
        errorMessage={errorMessage}
        onSubmit={setProjectName}
        projectName={projectName}
      />
      {isProjectNameSet && (
        <>
          {/* Step 1 */}
          {canShowStep(1) && <Step1 projectName={projectName} onSubmit={finishStep} />}
          {/* Step 2 */}
          {canShowStep(2) && (
            <>
              <Divider titlePadding={2} titleColor={'whiteBright'} title={'Installation setup'} />
            </>
          )}
        </>
      )}
    </Box>
  )
}

export default App
