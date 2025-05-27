import type { MultiSelectItem } from '../types/types.js'

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
 * Selected features won't be removed, unselected features will be.
 * @param feature
 * @param featuresList
 */
const featureSelected = (feature: string, featuresList: Array<MultiSelectItem> | undefined) => {
  return !!featuresList?.find((item: MultiSelectItem) => item.value === feature)
}
