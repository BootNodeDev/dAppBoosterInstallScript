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

/**
 * @description Asks the user for setup options
 * @returns {Promise<{demoSupport: boolean, subgraphSupport: boolean, typedocSupport: boolean, vocsSupport: boolean, commitHookPackagesSupport: boolean}>}
 */
export async function installationSetup() {
  const demoSupport =
    (await askQuestion(`Keep the ${chalk.bold('home page demos')}? (Y/n) `)).toLowerCase() !== 'n'

  const subgraphSupport =
    (await askQuestion(`Keep ${chalk.bold('subgraph')} support? (Y/n) `)).toLowerCase() !== 'n'

  const typedocSupport =
    (
      await askQuestion(
        `Keep ${chalk.bold('Typedoc')} (converts TypeScript comments to HTML documentation) support? (Y/n) `,
      )
    ).toLowerCase() !== 'n'

  const vocsSupport =
    (
      await askQuestion(
        `Keep ${chalk.bold('Vocs')} (static markdown documentation generation) support? (Y/n) `,
      )
    ).toLowerCase() !== 'n'

  const huskySupport =
    (
      await askQuestion(
        `Keep ${chalk.bold('Husky')} (Git hooks) support? Note: removing this will also remove ${chalk.bold('lint-staged')} and ${chalk.bold('commitlint')} (Y/n) `,
      )
    ).toLowerCase() !== 'n'

  return {
    demoSupport,
    subgraphSupport,
    typedocSupport,
    vocsSupport,
    huskySupport,
  }
}

/**
 * @description Prints instructions for subgraph support
 */
function subgraphInstructions() {
  console.log(
    `${chalk.yellow.bold('##################################################################################')}`,
  )
  console.log(
    `${chalk.yellow.bold('# WARNING: Your project support subgraphs, before you continue you MUST:         #')}`,
  )
  console.log(
    `${chalk.yellow.bold('##################################################################################')}`,
  )
  console.log('')
  console.log(
    `1- Provide your own API key for the var ${chalk.bold('PUBLIC_SUBGRAPHS_API_KEY')} in ${chalk.italic('.env.local')}`,
  )
  console.log(
    `   You can get one at ${chalk.bold.underline('https://thegraph.com/studio/apikeys/')}`,
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
  console.log('\n---\n')

  if (subgraphSupport) {
    subgraphInstructions()
  }
}
