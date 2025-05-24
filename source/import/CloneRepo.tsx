import { execSync } from 'node:child_process'
import { rmSync } from 'node:fs'
import { join } from 'node:path'
import { defaultExecOptions, fileExecOptions, repoUrl } from './config.js'
import React, { useState, type FC, ReactNode, useEffect } from 'react'
import { Text, Box } from 'ink'
import Spinner from 'ink-spinner'
import { Script, Spawn } from 'ink-spawn'

/**
 * @description Get the latest tag from the repository
 * @returns {string} The latest tag
 */
const getLatestTag = (): string | undefined => {
  const commandSilencer = '> /dev/null 2>&1'

  execSync(`git fetch --tags ${commandSilencer}`, defaultExecOptions)

  const tags = execSync('git tag -l --sort=-v:refname').toString().trim().split('\n')

  return tags[0]
}

const Working: FC<{ isWorking: boolean; children: ReactNode }> = ({ isWorking, children }) => (
  <Box>
    {isWorking && <Spinner type="dots" />}
    {children}
  </Box>
)

/**
 * @description Clone the repository
 */
const CloneRepo: FC<{ projectName: string }> = ({ projectName }) => {
  const projectDir = join(process.cwd(), projectName)
  const [step, setStep] = useState(0)
  const [error, setError] = useState<string | undefined>()
  const [latestTag, setLatestTag] = useState<string | undefined>()

  useEffect(() => {
    const cloneRepo = () => {
      try {
        setStep(1)
        execSync(
          `git clone --depth 1 --no-checkout "${repoUrl}" "${projectDir}"`,
          defaultExecOptions,
        )

        process.chdir(projectDir)

        setLatestTag(getLatestTag())

        setStep(2)
        if (latestTag) {
          execSync(`git checkout "${latestTag}"`, defaultExecOptions)
        } else {
          execSync('git checkout main', defaultExecOptions)
        }

        // Remove .git, and initialize the repo
        rmSync(join(projectDir, '.git'), fileExecOptions)
        execSync('git init', defaultExecOptions)

        setStep(3)
      } catch (error: any) {
        setError(`An error occurred: ${error.message}`)
      }
    }

    cloneRepo()
  }, [projectName])

  return (
    <>
      <Box>
        {error ? (
          <Text bold color={'red'}>
            {error}
          </Text>
        ) : (
          step > 0 && (
            <Working isWorking={step === 1}>
              <Text color={'whiteBright'}>Cloning dAppBooster in </Text>
              <Text italic>{projectName}</Text>
            </Working>
          )
        )}
        {step > 1 && (
          <Working isWorking={step === 2}>
            {latestTag ? (
              <Text color={'whiteBright'}>Checking out latest tag...</Text>
            ) : (
              <Text color={'whiteBright'}>
                No tags found, checking out<Text italic>main</Text> branch...
              </Text>
            )}
          </Working>
        )}
        {step > 2 && (
          <>
            <Text color={'whiteBright'}>
              Repository cloned in <Text italic>${projectDir}</Text>
            </Text>
            <Text color={'whiteBright'}>
              Version: <Text italic>${latestTag ? latestTag : 'main branch'}</Text>
            </Text>
          </>
        )}
      </Box>
    </>
  )
}

export default CloneRepo
