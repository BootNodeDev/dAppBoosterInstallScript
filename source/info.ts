import { featureDefinitions } from './constants/config.js'

export function getInfoOutput(): string {
  const features = Object.fromEntries(
    Object.entries(featureDefinitions).map(([name, def]) => [
      name,
      {
        description: def.description,
        default: def.default,
        ...(def.postInstall ? { postInstall: def.postInstall } : {}),
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
