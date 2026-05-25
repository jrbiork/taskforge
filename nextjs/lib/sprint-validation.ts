export interface ValidationResult {
  valid: boolean
  errors: string[]
}

export function validateCreateSprint(input: unknown): ValidationResult {
  const errors: string[] = []

  if (typeof input !== 'object' || input === null) {
    return { valid: false, errors: ['Request body must be an object'] }
  }

  const body = input as Record<string, unknown>

  // name: required, non-empty string, max 100 chars
  if (typeof body.name !== 'string' || body.name.trim() === '') {
    errors.push('name is required and must be a non-empty string')
  } else if (body.name.length > 100) {
    errors.push('name must be 100 characters or fewer')
  }

  // startDate: required, valid ISO date
  if (typeof body.startDate !== 'string' || body.startDate.trim() === '') {
    errors.push('startDate is required')
  } else if (isNaN(Date.parse(body.startDate))) {
    errors.push('startDate must be a valid ISO date')
  }

  // endDate: required, valid ISO date, must be after startDate
  if (typeof body.endDate !== 'string' || body.endDate.trim() === '') {
    errors.push('endDate is required')
  } else if (isNaN(Date.parse(body.endDate))) {
    errors.push('endDate must be a valid ISO date')
  } else if (
    typeof body.startDate === 'string' &&
    !isNaN(Date.parse(body.startDate)) &&
    Date.parse(body.endDate) <= Date.parse(body.startDate)
  ) {
    errors.push('endDate must be after startDate')
  }

  // goal: optional, string, max 500 chars
  if (body.goal !== undefined) {
    if (typeof body.goal !== 'string') {
      errors.push('goal must be a string')
    } else if (body.goal.length > 500) {
      errors.push('goal must be 500 characters or fewer')
    }
  }

  return { valid: errors.length === 0, errors }
}
