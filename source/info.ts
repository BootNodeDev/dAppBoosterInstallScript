import { getFeatureEntries } from './stacks/index.js'

export function getInfoOutput(): string {
  const features = Object.fromEntries(
    getFeatureEntries('evm').map(([name, definition]) => [
      name,
      {
        description: definition.description,
        default: definition.default,
        ...(definition.postInstall ? { postInstall: definition.postInstall } : {}),
        ...(definition.requires ? { requires: definition.requires } : {}),
      },
    ]),
  )

  return JSON.stringify(
    {
      features,
      modes: {
        full: 'Install all features',
        custom: 'Choose features individually',
      },
    },
    null,
    2,
  )
}
