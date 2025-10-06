import type { ValidationError } from '@repo/shared'

export interface SettingsActionState {
  success: boolean
  message?: string
  error?: string
  validationErrors?: ValidationError[]
  fieldErrors?: Record<string, string[]>
}
