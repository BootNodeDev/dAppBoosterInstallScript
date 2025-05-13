import { join } from 'node:path'
import readline from 'node:readline'
import chalk from 'chalk'
import { homeFolder } from './config.js'

/**
 * @description Check if the project name is valid
 */
export function checkProjectName(name) {
  const error = !name
    ? `
#################################################
# A directory name is mandatory.                #
#                                               #
# Letters (a–z, A–Z), numbers (0–9),            #
# hyphens (-), and underscores (_) are allowed. #
#################################################`
    : !/^[a-zA-Z0-9-_]+$/.test(name)
      ? `
#################################################
# Invalid project name.                         #
#                                               #
# Letters (a–z, A–Z), numbers (0–9),            #
# hyphens (-), and underscores (_) are allowed. #
#################################################`
      : ''

  if (error) {
    console.error(`${chalk.red.bold(error.trim())}`)
    process.exit(1)
  } else {
    return name.replace(/[^a-zA-Z0-9-_]/g, '-')
  }
}

/**
 * @description Asks a question to the user
 */
function askQuestion(query) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  })
  return new Promise((resolve) => {
    rl.question(query, (answer) => {
      rl.close()
      resolve(answer)
    })
  })
}

export async function setupQuestions() {
  const demoSupport =
    (
      await askQuestion('Do you want to keep the home page and all the demos? (Y/n) ')
    ).toLowerCase() === 'y'

  const subgraphSupport =
    (await askQuestion('Does your project need subgraph support? (Y/n) ')).toLowerCase() === 'y'

  return { demoSupport, subgraphSupport }
}

/**
 * @description Prints instructions for subgraph support
 */
function subgraphInstructions() {
  console.log(
    `${chalk.yellow.bold('##################################################################################')}`,
  )
  console.log(
    `${chalk.yellow.bold('# WARNING: Your project support subgraphs , before you continue you MUST:        #')}`,
  )
  console.log(
    `${chalk.yellow.bold('##################################################################################')}`,
  )
  console.log('')
  console.log(
    `${chalk.white(`1- Provide your own API key for the var ${chalk.bold('PUBLIC_SUBGRAPHS_API_KEY')} in ${chalk.italic('.env.local')}`)}`,
  )
  console.log(
    `${chalk.white(`   You can get one at ${chalk.bold.underline('https://thegraph.com/studio/apikeys/')}`)}`,
  )
  console.log(
    `2- Run ${chalk.bold('pnpm subgraph-codegen')} in your console from the project's folder`,
  )
  console.log('')
  console.log('Only after you followed these steps you may proceed.')
  console.log('\n---\n')
}

/**
 * @description Prints post-install instructions
 */
export function postInstallInstructions(subgraphSupport, projectName) {
  if (subgraphSupport) {
    subgraphInstructions()
  }

  console.log('To start development on your project:')
  console.log('')
  console.log('1- Move into the project directory')
  console.log(chalk.cyan(`$ cd ${projectName}`))
  console.log('')
  console.log('2- Start the development server')
  console.log(chalk.cyan('$ pnpm dev'))
  console.log('')
  console.log(
    `You can edit the home page in ${chalk.bold(`${join(process.cwd(), homeFolder)}/index.tsx`)}`,
  )
  console.log('\n---\n')
  console.log(`Check out ${chalk.bold('.env.local')} for more project configurations.`)
  console.log(`Check out the docs at ${chalk.bold.underline('https://docs.dappbooster.dev/')}`)
}
