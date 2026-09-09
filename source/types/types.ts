import type { FeatureName } from '../constants/config.js'

export type MultiSelectItem = { label: string; value: FeatureName }

export type InstallationType = 'full' | 'default' | 'custom'

export type InstallationSelectItem = { label: string; value: InstallationType }
