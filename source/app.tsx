import React, { useEffect, useState, useMemo } from 'react'
import Ask from './import/Ask.js'
import CloneRepo from './import/CloneRepo.js'
import { Box } from 'ink'
import { validateName, isAnswerConfirmed } from './import/utils.js'
import Divider from 'ink-divider'
import Gradient from 'ink-gradient'
import BigText from 'ink-big-text'

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

  return (
    <Box flexDirection={'column'} rowGap={1}>
      <Gradient colors={['#ff438c', '#bb1d79', '#8b46a4', '#6a2581']}>
        <BigText lineHeight={1} font={'chrome'} text="dAppBooster" />
      </Gradient>
      <Ask
        answer={projectName}
        errorMessage={errorMessage}
        onSubmit={setProjectName}
        question={'Project name?'}
        tip={'Letters (a–z, A–Z), numbers (0–9), hyphens (-), and underscores (_) are allowed.'}
      />
      {isProjectNameSet && (
        <>
          {/* Step 1 */}
          {step > 0 && (
            <>
              <Divider
                titlePadding={2}
                titleColor={'whiteBright'}
                title={`Cloning "${projectName}"`}
              />
              <CloneRepo projectName={projectName} onCompletion={() => finishStep()} />
            </>
          )}
          {/* Step 2 */}
          {step > 1 && (
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
