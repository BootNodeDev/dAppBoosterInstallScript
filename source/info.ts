import { type Stack, stackDefinitions, stackNames } from './constants/config.js'

type FeatureInfo = {
  description: string
  default: boolean
  postInstall?: string[]
  requires?: string[]
}

type StackInfo = {
  label: string
  description: string
  packageManager: string
  features: Record<string, FeatureInfo>
}

function buildStackInfo(stack: Stack): StackInfo {
  const config = stackDefinitions[stack]

  return {
    label: config.label,
    description: config.description,
    packageManager: config.packageManager,
    features: Object.fromEntries(
      Object.entries(config.features).map(([name, def]) => [
        name,
        {
          description: def.description,
          default: def.default,
          ...(def.postInstall ? { postInstall: def.postInstall } : {}),
          ...(def.requires ? { requires: def.requires } : {}),
        },
      ]),
    ),
  }
}

export class InvalidStackFilterError extends Error {
  constructor(filter: string) {
    super(`Unknown stack '${filter}'. Valid stacks: ${stackNames.join(', ')}`)
    this.name = 'InvalidStackFilterError'
  }
}

export function getInfoOutput(stackFilter?: string): string {
  if (stackFilter !== undefined && !(stackNames as string[]).includes(stackFilter)) {
    throw new InvalidStackFilterError(stackFilter)
  }

  const stacks: Record<string, StackInfo> = {}

  for (const name of stackNames) {
    if (stackFilter !== undefined && stackFilter !== name) {
      continue
    }
    stacks[name] = buildStackInfo(name)
  }

  return JSON.stringify(
    {
      stacks,
      modes: {
        full: 'Install all features',
        default: 'Install the recommended set (Canton only; for EVM this equals full)',
        custom: 'Choose features individually',
      },
    },
    null,
    2,
  )
}
