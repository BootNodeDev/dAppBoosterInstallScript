import { join } from 'node:path'
import process from 'node:process'
import { featurePackages } from '../constants/config.js'
import type { MultiSelectItem } from '../types/types.js'

export function getProjectFolder(projectName: string) {
  return join(process.cwd(), projectName)
}

/**
 * Utility functions for import process
 * @param name
 */
export function isValidName(name: string) {
  return /^[a-zA-Z0-9_]+$/.test(name)
}

/**
 * Checks if the answer is confirmed
 * @param answer
 * @param errorMessage
 */
export function isAnswerConfirmed(answer?: string, errorMessage?: string): boolean {
  return (
    answer !== '' && answer !== undefined && (errorMessage === '' || errorMessage === undefined)
  )
}

/**
 * Checks if the step can be shown
 * @param currentStep
 * @param stepToShow
 */
export function canShowStep(currentStep: number, stepToShow: number) {
  return currentStep > stepToShow - 1
}

/**
 * Returns true a feature is selected in the features list
 * @param feature
 * @param featuresList
 */
export function featureSelected(feature: string, featuresList: Array<MultiSelectItem> | undefined) {
  return !!featuresList?.find((item: MultiSelectItem) => item.value === feature)
}

/**
 * Returns the packages to remove checking first if the feature is selected or not.
 * Selected features are kept, unselected features are removed.
 * @param feature
 * @param featuresList
 */
export function getPackages(feature: string, featuresList: Array<MultiSelectItem> | undefined) {
  const packages = featurePackages[feature]

  return featureSelected(feature, featuresList) ? [] : packages?.length ? packages : []
}
