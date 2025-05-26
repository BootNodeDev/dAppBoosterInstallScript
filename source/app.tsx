import { Box } from 'ink'
import BigText from 'ink-big-text'
import Gradient from 'ink-gradient'
import React, { useState } from 'react'
import Step1 from './import/Step1.js'
import Step2 from './import/Step2.js'
import Step3 from './import/Step3.js'
import { canShowStep } from './import/utils.js'

const App = () => {
  const [projectName, setProjectName] = useState<string>('')
  const [currentStep, setCurrentStep] = useState(1)

  const finishStep = () => setCurrentStep(currentStep + 1)

  const onSelect = (value: string) => {
    console.log(value)
  }

  return (
    <Box
      flexDirection={'column'}
      rowGap={1}
    >
      <Gradient colors={['#ff438c', '#bb1d79', '#8b46a4', '#6a2581']}>
        <BigText
          lineHeight={1}
          font={'chrome'}
          text="dAppBooster"
        />
      </Gradient>
      <Step1
        onSubmit={setProjectName}
        onCompletion={finishStep}
        projectName={projectName}
      />
      {canShowStep(currentStep, 2) && (
        <Step2
          projectName={projectName}
          onCompletion={finishStep}
        />
      )}
      {canShowStep(currentStep, 3) && (
        <Step3
          onCompletion={finishStep}
          onSelect={onSelect}
          projectName={projectName}
        />
      )}
    </Box>
  )
}

export default App
