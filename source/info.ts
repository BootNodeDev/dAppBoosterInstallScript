import { featureEntries } from './config.js'

export function getInfoOutput(): string {
  const features = Object.fromEntries(
    featureEntries.map(([name, definition]) => [
      name,
      {
        description: definition.description,
        default: definition.default,
        postInstall: definition.postInstall,
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
