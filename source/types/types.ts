export type Stack = 'evm'

export type PackageManager = 'pnpm'

/** Every feature name the EVM stack defines. `stacks/evm.ts` fails to compile if they disagree. */
export type FeatureName = 'demo' | 'subgraph' | 'typedoc' | 'vocs' | 'husky'

export type InstallationType = 'full' | 'custom'

export type MultiSelectItem = { label: string; value: FeatureName }

export type InstallationSelectItem = { label: string; value: InstallationType }

/** One setting on the review step. The step prints the label and highlights the value. */
export type PlanSummaryItem = { label: string; value: string }

/**
 * A single optional feature of a stack.
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

export type EnvFile = {
  from: string
  to: string
}

/** A labelled group of paths cleanup removes whatever the user picked. */
export type CleanupGroup = {
  label: string
  paths: string[]
}

/**
 * A stack the installer can scaffold.
 *
 * @property ref - Tag or branch to clone. Left out, the stack is cloned at its newest tag. Today
 * only `DAPPBOOSTER_REF` sets it, for forks and pre-release testing.
 * @property prepare - What every scaffold drops, whatever the user picked: paths the template
 * keeps for itself. Applied before the package manager runs.
 * @property staging - The template's staging directory, holding the replacement files a
 * deselected feature restores. Removed once cleanup is finished with it.
 */
export type StackConfig = {
  repoUrl: string
  ref?: string
  packageManager: PackageManager
  prepare?: CleanupGroup
  staging?: CleanupGroup
  envFiles: EnvFile[]
  features: Record<string, FeatureDefinition>
}
