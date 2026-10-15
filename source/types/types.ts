/** Every feature name the config defines. `config.ts` fails to compile if they disagree. */
export type FeatureName = 'demo' | 'subgraph' | 'typedoc' | 'vocs' | 'husky'

export type InstallationType = 'full' | 'custom'

export type MultiSelectItem = { label: string; value: FeatureName }

export type InstallationSelectItem = { label: string; value: InstallationType }

/** One setting on the review step. The step prints the label and highlights the value. */
export type PlanSummaryItem = { label: string; value: string }

/**
 * A single optional feature of the template.
 *
 * @property packages - Dependencies the package manager removes (`pnpm remove`) when the feature
 * is deselected, so package.json and the lockfile stay in step.
 * @property paths - Relative files and directories deleted when the feature is deselected.
 * @property scripts - package.json script names deleted when the feature is deselected.
 */
export type FeatureDefinition = {
  description: string
  label: string
  packages: string[]
  default: boolean
  postInstall?: string[]
  paths?: string[]
  scripts?: string[]
}
