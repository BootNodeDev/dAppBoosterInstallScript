import {Box} from 'ink'
import Divider from 'ink-divider'
import React, {useState} from 'react'
import Step1 from './import/Step1.js'
import Step2 from './import/Step2.js'
import {canShowStep} from './import/utils.js'

const App = () => {
  const [projectName, setProjectName] = useState<string>('')
  const [currentStep, setCurrentStep] = useState(1)

  const finishStep = () => setCurrentStep(currentStep + 1)

  return (
    <Box
      flexDirection={'column'}
      rowGap={1}
    >
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
        <Divider
          titlePadding={2}
          titleColor={'whiteBright'}
          title={'Installation setup'}
        />
      )}
    </Box>
  )
}

export default App
