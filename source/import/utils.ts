function isValidName(name: string) {
  return /^[a-zA-Z0-9-_]+$/.test(name)
}

export function validateName(name: string): string {
  if (name.length > 0 && !isValidName(name)) return 'Not a valid name!'

  return ''
}

export function isAnswerConfirmed(answer?: string, errorMessage?: string) {
  return (
    answer !== '' && answer !== undefined && (errorMessage === '' || errorMessage === undefined)
  )
}
